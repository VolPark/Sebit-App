/**
 * AML Sanction Lists Configuration
 * 
 * Centralized configuration for all sanction list providers.
 * All URLs and enable flags are configurable via environment variables.
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger({ module: 'AML:Config' });

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type SanctionListId = 'EU' | 'OFAC' | 'CZ' | 'AMLA';

export interface SanctionListConfig {
    id: SanctionListId;
    name: string;
    description: string;
    url: string;
    enabled: boolean;
    format: 'xml' | 'json' | 'csv';
}

// ═══════════════════════════════════════════════════════════
// DEFAULT URLS (Can be overridden via env vars)
// ═══════════════════════════════════════════════════════════

const DEFAULT_URLS: Record<SanctionListId, string> = {
    EU: 'https://webgate.ec.europa.eu/europeaid/fsd/fsf/public/files/xmlFullSanctionsList/content?token=dG9rZW4tMjAxNw',
    OFAC: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
    CZ: 'https://www.mzv.cz/file/5765975/vnitrostatni_sankcni_seznam.csv',
    AMLA: '', // Placeholder - not yet available
};

// ═══════════════════════════════════════════════════════════
// CONFIGURATION LOADER
// ═══════════════════════════════════════════════════════════

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}

function getEnvString(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
}

function getActiveLists(): SanctionListId[] {
    const envValue = process.env.AML_ACTIVE_LISTS;
    if (!envValue) {
        // Default: EU and CZ active
        return ['EU', 'CZ'];
    }

    const validIds: SanctionListId[] = ['EU', 'OFAC', 'CZ', 'AMLA'];
    const parsed = envValue.split(',').map(s => s.trim().toUpperCase()) as SanctionListId[];

    return parsed.filter(id => validIds.includes(id));
}

// ═══════════════════════════════════════════════════════════
// SANCTION LIST CONFIGURATIONS
// ═══════════════════════════════════════════════════════════

export const SANCTION_LISTS: Record<SanctionListId, SanctionListConfig> = {
    EU: {
        id: 'EU',
        name: 'EU Consolidated List',
        description: 'European Union Consolidated Financial Sanctions List',
        url: getEnvString('AML_EU_LIST_URL', DEFAULT_URLS.EU),
        enabled: getEnvBoolean('AML_EU_ENABLED', true),
        format: 'xml',
    },
    OFAC: {
        id: 'OFAC',
        name: 'US OFAC SDN',
        description: 'US Treasury OFAC Specially Designated Nationals List',
        url: getEnvString('AML_OFAC_LIST_URL', DEFAULT_URLS.OFAC),
        enabled: getEnvBoolean('AML_OFAC_ENABLED', true),
        format: 'xml',
    },
    CZ: {
        id: 'CZ',
        name: 'CZ MZV List',
        description: 'Czech Ministry of Foreign Affairs National Sanctions List',
        url: getEnvString('AML_CZ_LIST_URL', DEFAULT_URLS.CZ),
        enabled: getEnvBoolean('AML_CZ_ENABLED', true),
        format: 'csv',
    },
    AMLA: {
        id: 'AMLA',
        name: 'EU AMLA',
        description: 'Future EU Anti-Money Laundering Authority List (Placeholder)',
        url: getEnvString('AML_AMLA_LIST_URL', DEFAULT_URLS.AMLA),
        enabled: getEnvBoolean('AML_AMLA_ENABLED', false),
        format: 'xml',
    },
};

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

/**
 * Returns list of currently active sanction list IDs
 */
export function getActiveListIds(): SanctionListId[] {
    const activeLists = getActiveLists();

    return activeLists.filter(id => {
        const config = SANCTION_LISTS[id];
        if (!config) return false;
        if (!config.enabled) {
            logger.debug(`List ${id} is disabled via AML_${id}_ENABLED`);
            return false;
        }
        if (!config.url) {
            logger.warn(`List ${id} has no URL configured, skipping`);
            return false;
        }
        return true;
    });
}

/**
 * Returns configurations for all active sanction lists
 */
export function getActiveListConfigs(): SanctionListConfig[] {
    return getActiveListIds().map(id => SANCTION_LISTS[id]);
}

/**
 * Check if a specific list is active
 */
export function isListActive(id: SanctionListId): boolean {
    return getActiveListIds().includes(id);
}

/**
 * Get configuration for a specific list
 */
export function getListConfig(id: SanctionListId): SanctionListConfig | null {
    return SANCTION_LISTS[id] || null;
}

/**
 * Log current configuration status
 */
export function logConfigStatus(): void {
    const activeIds = getActiveListIds();
    logger.info('=== AML Sanction Lists Configuration ===');
    logger.info(`Active lists: ${activeIds.join(', ') || 'NONE'}`);

    Object.values(SANCTION_LISTS).forEach(config => {
        const status = activeIds.includes(config.id) ? '✓ ACTIVE' : '✗ INACTIVE';
        logger.info(`  ${config.id}: ${status} - ${config.name}`);
        if (config.url) {
            logger.debug(`    URL: ${config.url.substring(0, 60)}...`);
        }
    });
}
