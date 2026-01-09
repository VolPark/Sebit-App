export type SupplierType = 'sftp_xml' | 'sftp_csv' | 'api_rest' | 'sftp_demos';

export interface SupplierConfig {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    path?: string;
    [key: string]: any;
}

export interface SupplierItem {
    code: string;
    name: string;
    description?: string;
    price: number;
    currency?: string;
    unit?: string;
    image_url?: string;
    category?: string;
    metadata?: any;
}

export interface ISupplierProvider {
    validateConfig(config: SupplierConfig): Promise<boolean>;
    fetchItems(config: SupplierConfig): Promise<SupplierItem[]>;
}

export class SupplierService {
    private static providers: Record<SupplierType, ISupplierProvider> = {} as any;

    static registerProvider(type: SupplierType, provider: ISupplierProvider) {
        this.providers[type] = provider;
    }

    static getProvider(type: SupplierType): ISupplierProvider {
        const provider = this.providers[type];
        if (!provider) {
            throw new Error(`Provider for type ${type} not found`);
        }
        return provider;
    }
}
