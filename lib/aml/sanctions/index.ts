/**
 * Unified Sanction List Registry
 * 
 * Central registry for all sanction list providers.
 * Provides methods to update all active lists or specific ones.
 */

import { createLogger } from '@/lib/logger';
import { getActiveListIds, SanctionListId, logConfigStatus } from '../config';
import { SanctionListProvider } from './base';
import { euProvider } from './eu';
import { ofacProvider } from './ofac';
import { czProvider } from './cz';
import { amlaProvider } from './amla';

const logger = createLogger({ module: 'AML:Registry' });

// ═══════════════════════════════════════════════════════════
// PROVIDER REGISTRY
// ═══════════════════════════════════════════════════════════

const PROVIDERS: Record<SanctionListId, SanctionListProvider> = {
    EU: euProvider,
    OFAC: ofacProvider,
    CZ: czProvider,
    AMLA: amlaProvider,
};

// ═══════════════════════════════════════════════════════════
// REGISTRY FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Get all registered providers
 */
export function getAllProviders(): SanctionListProvider[] {
    return Object.values(PROVIDERS);
}

/**
 * Get only active providers (enabled and configured)
 */
export function getActiveProviders(): SanctionListProvider[] {
    const activeIds = getActiveListIds();
    return activeIds.map(id => PROVIDERS[id]).filter(Boolean);
}

/**
 * Get a specific provider by ID
 */
export function getProvider(id: SanctionListId): SanctionListProvider | null {
    return PROVIDERS[id] || null;
}

/**
 * Update all active sanction lists
 * Returns summary of results
 */
export async function updateAllLists(): Promise<{
    success: SanctionListId[];
    failed: { id: SanctionListId; error: string }[];
    skipped: SanctionListId[];
    totalRecords: number;
}> {
    const result = {
        success: [] as SanctionListId[],
        failed: [] as { id: SanctionListId; error: string }[],
        skipped: [] as SanctionListId[],
        totalRecords: 0,
    };

    logConfigStatus();

    const activeProviders = getActiveProviders();

    if (activeProviders.length === 0) {
        logger.warn('No active sanction list providers configured');
        return result;
    }

    logger.info(`Starting update of ${activeProviders.length} sanction lists...`);

    for (const provider of activeProviders) {
        try {
            if (!provider.isEnabled()) {
                logger.debug(`Skipping ${provider.listId} - not enabled`);
                result.skipped.push(provider.listId);
                continue;
            }

            logger.info(`Updating ${provider.name}...`);

            const rawData = await provider.fetchList();
            const count = await provider.parseAndSave(rawData);

            result.success.push(provider.listId);
            result.totalRecords += count;

            logger.info(`✓ ${provider.listId} updated: ${count} records`);

        } catch (error: any) {
            logger.error(`✗ ${provider.listId} failed:`, error.message);
            result.failed.push({
                id: provider.listId,
                error: error.message || 'Unknown error'
            });
        }
    }

    logger.info('=== Update Summary ===');
    logger.info(`Success: ${result.success.join(', ') || 'None'}`);
    logger.info(`Failed: ${result.failed.map(f => f.id).join(', ') || 'None'}`);
    logger.info(`Total records: ${result.totalRecords}`);

    return result;
}

/**
 * Update a specific sanction list by ID
 */
export async function updateList(id: SanctionListId): Promise<{
    success: boolean;
    records: number;
    error?: string;
}> {
    const provider = getProvider(id);

    if (!provider) {
        return { success: false, records: 0, error: `Unknown provider: ${id}` };
    }

    if (!provider.isEnabled()) {
        return { success: false, records: 0, error: `Provider ${id} is not enabled` };
    }

    try {
        logger.info(`Updating ${provider.name}...`);
        const rawData = await provider.fetchList();
        const count = await provider.parseAndSave(rawData);
        logger.info(`✓ ${id} updated: ${count} records`);
        return { success: true, records: count };
    } catch (error: any) {
        logger.error(`✗ ${id} failed:`, error.message);
        return { success: false, records: 0, error: error.message };
    }
}

// Re-export providers for direct access
export { euProvider } from './eu';
export { ofacProvider } from './ofac';
export { czProvider } from './cz';
export { amlaProvider } from './amla';
