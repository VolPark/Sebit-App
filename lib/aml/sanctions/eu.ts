/**
 * EU Consolidated Financial Sanctions List Provider
 * 
 * Source: European Commission
 * Format: XML (FSF - Financial Sanctions Files)
 */

import { XMLParser } from 'fast-xml-parser';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import { SANCTION_LISTS, SanctionListConfig } from '../config';
import { BaseSanctionProvider } from './base';

import { getErrorMessage } from '@/lib/errors';
const logger = createLogger({ module: 'AML:EU' });

// Admin client for database operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export class EUSanctionsProvider extends BaseSanctionProvider {
    readonly listId = 'EU' as const;
    readonly name = 'EU Consolidated Financial Sanctions List';

    constructor(config?: SanctionListConfig) {
        super(config || SANCTION_LISTS.EU);
    }

    async fetchList(): Promise<string> {
        logger.info('Fetching EU Sanctions List from:', this.config.url);
        const data = await super.fetchList();
        logger.info('Downloaded EU XML size:', (data.length / 1024 / 1024).toFixed(2), 'MB');
        return data;
    }

    /**
     * Parses the XML data and extracts entities.
     * Implements deep extraction for:
     * - Nested Regulation Summaries (inside Aliases, Birthdates)
     * - Detailed Aliases (Designations, Titles, Strong/Weak)
     * - Birth Information (City, Region, Place)
     * - Identification Documents
     */
    async parseAndSave(xmlData: string): Promise<number> {
        const startTime = Date.now();
        let logId: number | null = null;

        // Start Log
        try {
            const { data } = await supabaseAdmin.from('aml_sanction_update_logs').insert([{
                list_name: this.listId,
                status: 'running',
                message: 'Parsing EU sanctions list...'
            }]).select().single();
            if (data) logId = data.id;
        } catch (e) {
            logger.error('Failed to create start log', e);
        }

        try {
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: "@_"
            });
            const jsonObj = parser.parse(xmlData);

            // Access the list of entities (structure: export -> sanctionEntity)
            const entities = jsonObj?.export?.sanctionEntity;

            if (!entities || !Array.isArray(entities)) {
                throw new Error('Invalid XML structure: sanctionEntity array not found');
            }

            logger.info(`Found ${entities.length} EU entities to process.`);

            const batchSize = 100;
            let processed = 0;
            let batch: any[] = [];

            for (const entity of entities) {
                // 1. EXTRACT ALIASES
                const nameAliases = this.asArray(entity.nameAlias);
                const mainNameObj = nameAliases.find((n: any) => n['@_function']) || nameAliases[0];
                const wholeName = mainNameObj?.['@_wholeName'] || 'Unknown';

                const detailedAliases = nameAliases.map((n: any) => ({
                    wholeName: n['@_wholeName'],
                    firstName: n['@_firstName'],
                    lastName: n['@_lastName'],
                    function: n['@_function'],
                    gender: n['@_gender'],
                    title: n['@_title'],
                    language: n['@_nameLanguage'],
                    isStrong: n['@_strong'] === 'true'
                }));

                // 2. EXTRACT BIRTH DATES
                const birthDates = this.asArray(entity.birthdate).map((b: any) => ({
                    date: b['@_birthdate'],
                    city: b['@_city'],
                    country: b['@_countryDescription'],
                    countryIso: b['@_countryIso2Code'],
                    place: b['@_place'],
                    region: b['@_region'],
                    remark: b.remark
                }));

                // 3. EXTRACT CITIZENSHIPS
                const citizenships = this.asArray(entity.citizenship).map((c: any) => ({
                    country: c['@_countryDescription'],
                    countryIso: c['@_countryIso2Code'],
                    region: c['@_region']
                }));

                // 4. EXTRACT ADDRESSES
                const addresses = this.asArray(entity.address).map((a: any) => ({
                    street: a['@_street'] || a.street,
                    city: a['@_city'] || a.city,
                    zip: a['@_zipCode'] || a.zipCode,
                    country: a['@_countryDescription'] || a.countryDescription,
                    countryIso: a['@_countryIso2Code'] || a.countryIso2Code,
                    place: a['@_place'] || a.place
                }));

                // 5. EXTRACT IDENTIFICATIONS
                const identifications = this.asArray(entity.identification).map((i: any) => ({
                    type: i['@_identificationType'],
                    number: i['@_number'],
                    country: i['@_countryDescription'],
                    countryIso: i['@_countryIso2Code'],
                    issuedBy: i['@_issuedBy'],
                    issueDate: i['@_issueDate']
                }));

                // 6. EXTRACT REGULATIONS (Deep Search)
                const rootRegs = this.asArray(entity.regulation);
                const aliasRegs = nameAliases.flatMap((n: any) => this.asArray(n.regulationSummary));
                const birthRegs = this.asArray(entity.birthdate).flatMap((b: any) => this.asArray(b.regulationSummary));
                const citizenRegs = this.asArray(entity.citizenship).flatMap((c: any) => this.asArray(c.regulationSummary));

                const rawRegs = [...rootRegs, ...aliasRegs, ...birthRegs, ...citizenRegs];

                const uniqueRegs = new Map();
                rawRegs.forEach((r: any) => {
                    const url = r.publicationUrl || r['@_publicationUrl'];
                    const title = r['@_numberTitle'];
                    const key = url || title;
                    if (key && !uniqueRegs.has(key)) {
                        uniqueRegs.set(key, {
                            title: title,
                            url: url,
                            date: r['@_publicationDate'],
                            type: r['@_regulationType']
                        });
                    }
                });
                const regulations = Array.from(uniqueRegs.values());

                // Prepare Record
                const record = {
                    list_name: this.listId,
                    external_id: entity['@_logicalId'],
                    name: wholeName,
                    details: {
                        entityInfo: {
                            designationDate: entity['@_designationDate'],
                            designationDetails: entity['@_designationDetails'],
                            logicalId: entity['@_logicalId'],
                            unitedNationId: entity['@_unitedNationId'],
                            subjectType: entity.subjectType?.['@_code'],
                            subjectClassification: entity.subjectType?.['@_classificationCode']
                        },
                        nameAliases: detailedAliases,
                        birthDates,
                        citizenships,
                        addresses,
                        identifications,
                        regulations,
                        remarks: this.asArray(entity.remark)
                    },
                    type: entity.subjectType?.['@_code'] || 'unknown',
                    updated_at: new Date().toISOString()
                };

                batch.push(record);

                if (batch.length >= batchSize) {
                    await this.upsertBatch(batch);
                    processed += batch.length;
                    batch = [];
                }
            }

            // Final Batch
            if (batch.length > 0) {
                await this.upsertBatch(batch);
                processed += batch.length;
            }

            // Success Log
            if (logId) {
                await supabaseAdmin.from('aml_sanction_update_logs').update({
                    status: 'success',
                    records_count: processed,
                    message: `EU update completed. Processed ${processed} entities.`,
                    duration_ms: Date.now() - startTime
                }).eq('id', logId);
            }

            logger.info(`EU sync complete: ${processed} records processed`);
            return processed;

        } catch (error: unknown) {
            logger.error('EU Sanctions Update Failed:', error);
            if (logId) {
                await supabaseAdmin.from('aml_sanction_update_logs').update({
                    status: 'failed',
                    message: getErrorMessage(error) || 'Unknown error',
                    duration_ms: Date.now() - startTime
                }).eq('id', logId);
            }
            throw error;
        }
    }

    private asArray(item: any): any[] {
        if (!item) return [];
        return Array.isArray(item) ? item : [item];
    }

    private async upsertBatch(batch: any[]): Promise<void> {
        const { error } = await supabaseAdmin
            .from('aml_sanction_list_items')
            .upsert(batch, { onConflict: 'list_name,external_id' });

        if (error) {
            logger.error('Error upserting EU batch:', error);
            throw error;
        }
    }
}

// Singleton instance
export const euProvider = new EUSanctionsProvider();

// Backward compatibility - export as EUSanctionsService
export const EUSanctionsService = {
    fetchList: () => euProvider.fetchList(),
    parseAndSave: (xmlData: string) => euProvider.parseAndSave(xmlData),
    upsertBatch: (batch: any[]) => (euProvider as any).upsertBatch(batch),
};
