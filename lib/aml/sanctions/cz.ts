/**
 * Czech Republic MZV (Ministry of Foreign Affairs) National Sanctions List Provider
 * 
 * Source: Ministerstvo zahraničních věcí ČR - Vnitrostátní sankční seznam
 * Format: CSV
 * 
 * Based on Act No. 1/2023 Coll. on restrictive measures
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import { SANCTION_LISTS, SanctionListConfig } from '../config';
import { BaseSanctionProvider } from './base';

import { getErrorMessage } from '@/lib/errors';
const logger = createLogger({ module: 'AML:CZ' });

// Admin client for database operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export class CZSanctionsProvider extends BaseSanctionProvider {
    readonly listId = 'CZ' as const;
    readonly name = 'Czech MZV National Sanctions List';

    constructor(config?: SanctionListConfig) {
        super(config || SANCTION_LISTS.CZ);
    }

    async fetchList(): Promise<string> {
        logger.info('Fetching CZ MZV Sanctions List from:', this.config.url);
        const data = await super.fetchList();
        logger.info('Downloaded CZ CSV size:', (data.length / 1024).toFixed(2), 'KB');
        return data;
    }

    async parseAndSave(csvData: string): Promise<number> {
        const startTime = Date.now();
        let logId: number | null = null;

        // Start log entry
        try {
            const { data } = await supabaseAdmin.from('aml_sanction_update_logs').insert([{
                list_name: this.listId,
                status: 'running',
                message: 'Parsing CZ MZV CSV sanctions list...'
            }]).select().single();
            if (data) logId = data.id;
        } catch (e) {
            logger.error('Failed to create start log', e);
        }

        try {
            // Parse CSV - split by lines
            const lines = csvData.split('\n');

            if (lines.length < 2) {
                throw new Error('Invalid CSV: No data rows found');
            }

            // First line is header
            const headerLine = lines[0];
            const header = this.parseCSVLine(headerLine);
            logger.info(`CSV columns (${header.length}): ${header.slice(0, 5).join(' | ')}...`);

            // Collect valid data rows (skip header and empty rows)
            const dataRows: string[][] = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();

                // Skip empty lines or lines with only commas/semicolons
                if (!line || /^[,;\s]+$/.test(line)) {
                    continue;
                }

                const values = this.parseCSVLine(line);

                // Check if this is a real data row (first column should have content)
                const firstCol = values[0]?.trim();
                if (!firstCol) {
                    continue;
                }

                dataRows.push(values);
            }

            logger.info(`Found ${dataRows.length} valid CZ entries to process.`);

            const batchSize = 50;
            let processed = 0;
            let batch: any[] = [];
            const seenIds = new Set<string>();

            for (let i = 0; i < dataRows.length; i++) {
                const values = dataRows[i];
                const entry = this.rowToEntry(values, i);

                if (!entry) continue;

                // Ensure unique external_id within batch
                if (seenIds.has(entry.external_id)) {
                    entry.external_id = `${entry.external_id}_${i}`;
                }
                seenIds.add(entry.external_id);

                batch.push(entry);

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
                    message: `CZ MZV update completed. Processed ${processed} entries.`,
                    duration_ms: Date.now() - startTime
                }).eq('id', logId);
            }

            logger.info(`CZ sync complete: ${processed} records processed`);
            return processed;

        } catch (error: unknown) {
            logger.error('CZ Sanctions Update Failed:', error);
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

    /**
     * Parse CSV line handling quoted values with commas inside
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                // Toggle quote state, but don't add the quote itself
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        // Don't forget the last field
        result.push(current.trim());

        return result;
    }

    /**
     * Convert CSV row to database record
     * 
     * Columns (based on actual MZV CSV):
     * 0: Přijmení / název entity (with transliterations separated by /)
     * 1: Jméno fyzické osoby
     * 2: Datum narození
     * 3: Státní příslušnost / sídlo
     * 4: Další identifikační údaje
     * 5: Datum zápisu
     * 6: Číslo usnesení vlády
     * 7: Ustanovení předpisu EU
     * 8: Popis postižitelného jednání
     * 9: Omezující opatření
     */
    private rowToEntry(values: string[], rowIndex: number): any | null {
        // Column 0: Surname/Entity name (may contain multiple transliterations)
        const rawSurname = values[0]?.trim() || '';
        // Column 1: First name
        const rawFirstName = values[1]?.trim() || '';
        // Column 2: Birth date
        const birthDate = values[2]?.trim() || '';
        // Column 3: Nationality/Residence
        const nationality = values[3]?.trim() || '';
        // Column 4: Additional identifiers
        const identifiers = values[4]?.trim() || '';
        // Column 5: Date added
        const dateAdded = values[5]?.trim() || '';
        // Column 6: Government resolution
        const govResolution = values[6]?.trim() || '';
        // Column 7: EU regulation
        const euRegulation = values[7]?.trim() || '';
        // Column 8: Description
        const description = values[8]?.trim() || '';
        // Column 9: Measures
        const measures = values[9]?.trim() || '';

        if (!rawSurname) {
            return null;
        }

        // Extract primary name from transliterations (first part before /)
        // Also handle notes like "Zápis byl zrušen..."
        const surname = rawSurname.split('/')[0].trim();
        const firstName = rawFirstName.split('/')[0].trim();

        // Check if entry was cancelled (contains "Zápis byl zrušen")
        const isCancelled = rawSurname.includes('Zápis byl zrušen') ||
            rawSurname.includes('zápis byl zrušen');

        // Build full name
        let name = '';
        if (firstName && surname) {
            name = `${firstName} ${surname}`;
        } else {
            name = surname;
        }

        // Clean up name (remove extra whitespace, newlines)
        name = name.replace(/\s+/g, ' ').trim();

        if (!name || name.length < 2) {
            return null;
        }

        // Determine entity type
        const isEntity = !firstName || surname.toLowerCase().includes('podnik') ||
            surname.toLowerCase().includes('federální');
        const entityType = isEntity ? 'entity' : 'person';

        // Generate unique ID
        const nameSlug = name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 40);

        const birthDateSlug = birthDate.replace(/[^0-9]/g, '').substring(0, 8);
        const externalId = birthDateSlug
            ? `CZ_${nameSlug}_${birthDateSlug}`
            : `CZ_${nameSlug}_${rowIndex}`;

        // Parse designation date to ISO format if possible
        const designationDate = this.parseDate(dateAdded);

        // Build regulations array from EU regulation reference
        const regulations = euRegulation ? [{
            title: euRegulation.substring(0, 200),
            type: 'EU Regulation',
            date: designationDate,
        }] : [];

        // Add government resolution as regulation too
        if (govResolution) {
            regulations.push({
                title: govResolution,
                type: 'CZ Government Resolution',
                date: designationDate,
            });
        }

        return {
            list_name: this.listId,
            external_id: externalId,
            name: name,
            type: entityType,
            details: {
                entityInfo: {
                    // UI-compatible fields
                    subjectType: entityType,
                    subjectClassification: firstName ? 'P' : 'E',
                    designationDate: designationDate,
                    logicalId: externalId,
                    function: identifiers, // "patriarcha moskevský..."
                    // Original CZ-specific fields
                    rawSurname,
                    rawFirstName,
                    description: description.substring(0, 2000),
                    measures,
                    isCancelled,
                },
                birthDates: birthDate ? [{
                    date: birthDate,
                }] : [],
                citizenships: nationality ? [{
                    country: nationality,
                }] : [],
                // UI expects nameAliases, not aliases
                nameAliases: this.extractAliases(rawSurname, rawFirstName),
                regulations: regulations,
            },
            updated_at: new Date().toISOString()
        };
    }

    /**
     * Parse Czech date format to ISO
     * Input: "26. dubna 2023" or "20. listopadu 1946"
     */
    private parseDate(dateStr: string): string | undefined {
        if (!dateStr) return undefined;

        const monthMap: Record<string, string> = {
            'ledna': '01', 'února': '02', 'března': '03', 'dubna': '04',
            'května': '05', 'června': '06', 'července': '07', 'srpna': '08',
            'září': '09', 'října': '10', 'listopadu': '11', 'prosince': '12',
        };

        // Try to match "DD. MONTH YYYY"
        const match = dateStr.match(/(\d{1,2})\.\s*(\w+)\s+(\d{4})/);
        if (match) {
            const day = match[1].padStart(2, '0');
            const monthName = match[2].toLowerCase();
            const year = match[3];
            const month = monthMap[monthName];
            if (month) {
                return `${year}-${month}-${day}`;
            }
        }

        return undefined;
    }

    /**
     * Extract aliases from transliterations (separated by /)
     */
    private extractAliases(rawSurname: string, rawFirstName: string): any[] {
        const surnameVariants = rawSurname.split('/').map(s => s.trim()).filter(s => s && !s.includes('Zápis byl'));
        const firstNameVariants = rawFirstName.split('/').map(s => s.trim()).filter(Boolean);

        const aliases: any[] = [];

        // Create combinations
        for (const surname of surnameVariants) {
            if (firstNameVariants.length > 0) {
                for (const firstName of firstNameVariants) {
                    aliases.push({
                        wholeName: `${firstName} ${surname}`,
                        firstName,
                        lastName: surname,
                    });
                }
            } else {
                aliases.push({
                    wholeName: surname,
                    lastName: surname,
                });
            }
        }

        return aliases;
    }

    private async upsertBatch(batch: any[]): Promise<void> {
        const { error } = await supabaseAdmin
            .from('aml_sanction_list_items')
            .upsert(batch, { onConflict: 'list_name,external_id' });

        if (error) {
            logger.error('Error upserting CZ batch:', error);
            throw error;
        }
    }
}

// Singleton instance
export const czProvider = new CZSanctionsProvider();
