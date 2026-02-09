/**
 * US OFAC SDN (Specially Designated Nationals) List Provider
 * 
 * Source: US Treasury Department
 * Format: XML (SDN list)
 */

import { XMLParser } from 'fast-xml-parser';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import { SANCTION_LISTS, SanctionListConfig } from '../config';
import { BaseSanctionProvider } from './base';

import { getErrorMessage } from '@/lib/errors';
const logger = createLogger({ module: 'AML:OFAC' });

// Admin client for database operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export class OFACSanctionsProvider extends BaseSanctionProvider {
    readonly listId = 'OFAC' as const;
    readonly name = 'US OFAC SDN List';

    constructor(config?: SanctionListConfig) {
        super(config || SANCTION_LISTS.OFAC);
    }

    async fetchList(): Promise<string> {
        logger.info('Fetching OFAC SDN List from:', this.config.url);
        const data = await super.fetchList();
        logger.info('Downloaded OFAC data size:', (data.length / 1024 / 1024).toFixed(2), 'MB');
        return data;
    }

    async parseAndSave(xmlData: string): Promise<number> {
        const startTime = Date.now();
        let logId: number | null = null;

        // Start log entry
        try {
            const { data } = await supabaseAdmin.from('aml_sanction_update_logs').insert([{
                list_name: this.listId,
                status: 'running',
                message: 'Parsing OFAC SDN list...'
            }]).select().single();
            if (data) logId = data.id;
        } catch (e) {
            logger.error('Failed to create start log', e);
        }

        try {
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: '@_'
            });
            const jsonObj = parser.parse(xmlData);

            // OFAC SDN structure: sdnList -> sdnEntry
            const entries = jsonObj?.sdnList?.sdnEntry;

            if (!entries || !Array.isArray(entries)) {
                throw new Error('Invalid OFAC XML structure: sdnEntry array not found');
            }

            logger.info(`Found ${entries.length} OFAC entries to process.`);

            const batchSize = 100;
            let processed = 0;
            let batch: any[] = [];

            const asArray = (item: any) => {
                if (!item) return [];
                return Array.isArray(item) ? item : [item];
            };

            for (const entry of entries) {
                // Extract primary name
                const firstName = entry.firstName || '';
                const lastName = entry.lastName || '';
                const wholeName = `${firstName} ${lastName}`.trim() || entry.sdnType || 'Unknown';

                // Extract aliases (AKA list)
                const akaList = asArray(entry.akaList?.aka);
                const aliases = akaList.map((aka: any) => ({
                    wholeName: `${aka.firstName || ''} ${aka.lastName || ''}`.trim(),
                    type: aka.type,
                    category: aka.category
                }));

                // Extract addresses
                const addressList = asArray(entry.addressList?.address);
                const addresses = addressList.map((addr: any) => ({
                    street: addr.address1,
                    city: addr.city,
                    country: addr.country,
                    zip: addr.postalCode
                }));

                // Extract ID documents
                const idList = asArray(entry.idList?.id);
                const identifications = idList.map((id: any) => ({
                    type: id.idType,
                    number: id.idNumber,
                    country: id.idCountry,
                    issueDate: id.issueDate,
                    expirationDate: id.expirationDate
                }));

                // Extract programs (sanctions programs)
                const programList = asArray(entry.programList?.program);

                // Extract date of birth
                const dobList = asArray(entry.dateOfBirthList?.dateOfBirthItem);
                const birthDates = dobList.map((dob: any) => ({
                    date: dob.dateOfBirth,
                    isMainEntry: dob.mainEntry === 'true'
                }));

                // Extract nationality
                const nationalityList = asArray(entry.nationalityList?.nationality);
                const citizenships = nationalityList.map((nat: any) => ({
                    country: nat.country,
                    isMain: nat.mainEntry === 'true'
                }));

                const record = {
                    list_name: this.listId,
                    external_id: String(entry.uid),
                    name: wholeName,
                    type: entry.sdnType || 'unknown',
                    details: {
                        entityInfo: {
                            uid: entry.uid,
                            sdnType: entry.sdnType,
                            programs: programList,
                            remarks: entry.remarks
                        },
                        nameAliases: aliases,
                        birthDates,
                        citizenships,
                        addresses,
                        identifications
                    },
                    updated_at: new Date().toISOString()
                };

                batch.push(record);

                if (batch.length >= batchSize) {
                    await this.upsertBatch(batch);
                    processed += batch.length;
                    batch = [];
                }
            }

            // Final batch
            if (batch.length > 0) {
                await this.upsertBatch(batch);
                processed += batch.length;
            }

            // Success log
            if (logId) {
                await supabaseAdmin.from('aml_sanction_update_logs').update({
                    status: 'success',
                    records_count: processed,
                    message: `OFAC update completed. Processed ${processed} entries.`,
                    duration_ms: Date.now() - startTime
                }).eq('id', logId);
            }

            logger.info(`OFAC sync complete: ${processed} records processed`);
            return processed;

        } catch (error: unknown) {
            logger.error('OFAC Sanctions Update Failed:', error);
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

    private async upsertBatch(batch: any[]): Promise<void> {
        const { error } = await supabaseAdmin
            .from('aml_sanction_list_items')
            .upsert(batch, { onConflict: 'list_name,external_id' });

        if (error) {
            logger.error('Error upserting OFAC batch:', error);
            throw error;
        }
    }
}

// Singleton instance
export const ofacProvider = new OFACSanctionsProvider();
