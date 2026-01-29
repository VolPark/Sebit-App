/**
 * Base Interface for Sanction List Providers
 * 
 * All sanction list providers must implement this interface
 * to ensure consistent behavior and easy extensibility.
 */

import { SanctionListConfig, SanctionListId } from '../config';

export interface SanctionListProvider {
    /** Unique identifier for this list */
    readonly listId: SanctionListId;

    /** Human-readable name */
    readonly name: string;

    /** Check if this provider is enabled and has valid configuration */
    isEnabled(): boolean;

    /** Fetch the raw list data from the source URL */
    fetchList(): Promise<string>;

    /** Parse the raw data and save to database, returns count of processed records */
    parseAndSave(rawData: string): Promise<number>;

    /** Get the configuration for this provider */
    getConfig(): SanctionListConfig;
}

/**
 * Abstract base class with common functionality
 */
export abstract class BaseSanctionProvider implements SanctionListProvider {
    abstract readonly listId: SanctionListId;
    abstract readonly name: string;

    protected config: SanctionListConfig;

    constructor(config: SanctionListConfig) {
        this.config = config;
    }

    isEnabled(): boolean {
        return this.config.enabled && !!this.config.url;
    }

    getConfig(): SanctionListConfig {
        return this.config;
    }

    async fetchList(): Promise<string> {
        if (!this.isEnabled()) {
            throw new Error(`Provider ${this.listId} is not enabled`);
        }

        const response = await fetch(this.config.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${this.listId} list: ${response.statusText}`);
        }

        return response.text();
    }

    abstract parseAndSave(rawData: string): Promise<number>;
}
