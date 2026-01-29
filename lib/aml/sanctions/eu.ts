import { XMLParser } from 'fast-xml-parser';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

// Create Admin Client for Backend Operations (Bypasses RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

const EU_LIST_URL = 'https://webgate.ec.europa.eu/europeaid/fsd/fsf/public/files/xmlFullSanctionsList/content?token=dG9rZW4tMjAxNw';

const logger = createLogger({ module: 'AML:EU' });

export const EUSanctionsService = {
    /**
     * Downloads the XML file from the EU Commission website.
     */
    fetchList: async (): Promise<string> => {
        logger.info('Fetching EU Sanctions List from:', EU_LIST_URL);
        const response = await fetch(EU_LIST_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch EU list: ${response.statusText}`);
        }
        const xmlData = await response.text();
        logger.info('Downloaded XML size:', (xmlData.length / 1024 / 1024).toFixed(2), 'MB');
        return xmlData;
    },

    /**
     * Parses the XML data and extracts entities.
     * Implements deep extraction for:
     * - Nested Regulation Summaries (inside Aliases, Birthdates)
     * - Detailed Aliases (Designations, Titles, Strong/Weak)
     * - Birth Information (City, Region, Place)
     * - Identification Documents
     */
    parseAndSave: async (xmlData: string) => {
        const startTime = Date.now();
        let logId = null;

        // Start Log
        try {
            const { data, error } = await supabaseAdmin.from('aml_sanction_update_logs').insert([{
                list_name: 'EU',
                status: 'running',
                message: 'Parsing started...'
            }]).select().single();
            if (data) logId = data.id;
        } catch (e) { logger.error('Failed to create start log', e); }

        try {
            const parser = new XMLParser({
                ignoreAttributes: false,
                attributeNamePrefix: "@_"
            });
            const jsonObj = parser.parse(xmlData);

            // Access the list of entities (structure varies, simplified assumption based on FSF spec)
            // Root -> export -> sanctionEntity
            const entities = jsonObj?.export?.sanctionEntity;

            if (!entities || !Array.isArray(entities)) {
                throw new Error('Invalid XML structure: sanctionEntity array not found');
            }

            logger.info(`Found ${entities.length} entities to process.`);

            const batchSize = 100;
            let processed = 0;
            let batch = [];

            // Helpers to handle single/array XML nodes
            const asArray = (item: any) => {
                if (!item) return [];
                return Array.isArray(item) ? item : [item];
            };

            for (const entity of entities) {
                // 1. EXTRACT ALIASES
                const nameAliases = asArray(entity.nameAlias);
                // Prefer aliases with function or just the first one
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
                const birthDates = asArray(entity.birthdate).map((b: any) => ({
                    date: b['@_birthdate'],
                    city: b['@_city'],
                    country: b['@_countryDescription'],
                    countryIso: b['@_countryIso2Code'],
                    place: b['@_place'],
                    region: b['@_region'],
                    remark: b.remark // simple text node in some schema versions
                }));

                // 3. EXTRACT CITIZENSHIPS
                const citizenships = asArray(entity.citizenship).map((c: any) => ({
                    country: c['@_countryDescription'],
                    countryIso: c['@_countryIso2Code'],
                    region: c['@_region']
                }));

                // 4. EXTRACT ADDRESSES
                const addresses = asArray(entity.address).map((a: any) => ({
                    street: a['@_street'] || a.street,
                    city: a['@_city'] || a.city,
                    zip: a['@_zipCode'] || a.zipCode,
                    country: a['@_countryDescription'] || a.countryDescription,
                    countryIso: a['@_countryIso2Code'] || a.countryIso2Code,
                    place: a['@_place'] || a.place
                }));

                // 5. EXTRACT IDENTIFICATIONS
                const identifications = asArray(entity.identification).map((i: any) => ({
                    type: i['@_identificationType'],
                    number: i['@_number'],
                    country: i['@_countryDescription'],
                    countryIso: i['@_countryIso2Code'],
                    issuedBy: i['@_issuedBy'],
                    issueDate: i['@_issueDate']
                }));

                // 6. EXTRACT REGULATIONS (Deep Search)
                // Collect regulationSummary from all nested objects that might have it
                const rootRegs = asArray(entity.regulation);
                const aliasRegs = nameAliases.flatMap((n: any) => asArray(n.regulationSummary));
                const birthRegs = asArray(entity.birthdate).flatMap((b: any) => asArray(b.regulationSummary));
                const citizenRegs = asArray(entity.citizenship).flatMap((c: any) => asArray(c.regulationSummary));

                // Merge all sources
                const rawRegs = [...rootRegs, ...aliasRegs, ...birthRegs, ...citizenRegs];

                const uniqueRegs = new Map();
                rawRegs.forEach((r: any) => {
                    // Handle both <publicationUrl>http...</publicationUrl> and publicationUrl="http..."
                    const url = r.publicationUrl || r['@_publicationUrl'];
                    const title = r['@_numberTitle'];

                    // Key by URL if available, else Title. Filter out empty ones.
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
                    list_name: 'EU',
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
                        regulations, // Now populated from deep search
                        remarks: asArray(entity.remark)
                    },
                    type: entity.subjectType?.['@_code'] || 'unknown',
                    updated_at: new Date().toISOString()
                };

                batch.push(record);

                if (batch.length >= batchSize) {
                    await EUSanctionsService.upsertBatch(batch);
                    processed += batch.length;
                    batch = [];
                }
            }

            // Final Batch
            if (batch.length > 0) {
                await EUSanctionsService.upsertBatch(batch);
                processed += batch.length;
            }

            // Success Log
            if (logId) {
                await supabaseAdmin.from('aml_sanction_update_logs').update({
                    status: 'success',
                    records_count: processed,
                    message: `Update completed. Processed ${processed} entities.`,
                    duration_ms: Date.now() - startTime
                }).eq('id', logId);
            }

            return processed;

        } catch (error: any) {
            logger.error('EU Sanctions Update Failed:', error);
            // Error Log
            if (logId) {
                await supabaseAdmin.from('aml_sanction_update_logs').update({
                    status: 'failed',
                    message: error.message || 'Unknown error',
                    duration_ms: Date.now() - startTime
                }).eq('id', logId);
            }
            throw error;
        }
    },

    upsertBatch: async (batch: any[]) => {
        const { error } = await supabaseAdmin
            .from('aml_sanction_list_items')
            .upsert(batch, { onConflict: 'list_name,external_id' });

        if (error) {
            logger.error('Error upserting batch:', error);
            throw error;
        }
    }
};
