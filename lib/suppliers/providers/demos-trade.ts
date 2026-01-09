import { ISupplierProvider, SupplierConfig, SupplierItem } from "../service";
import Client from 'ssh2-sftp-client';

export class DemosTradeProvider implements ISupplierProvider {
    async validateConfig(config: SupplierConfig): Promise<boolean> {
        const sftp = new Client();
        try {
            await sftp.connect({
                host: config.host,
                port: config.port || 22,
                username: config.username,
                password: config.password
            });
            await sftp.end();
            return true;
        } catch (e) {
            console.error('SFTP Connection failed:', e);
            return false;
        }
    }

    async fetchItems(config: SupplierConfig): Promise<SupplierItem[]> {
        const sftp = new Client();
        try {
            await sftp.connect({
                host: config.host,
                port: config.port || 22,
                username: config.username,
                password: config.password
            });

            const fileList = await sftp.list(config.path || '.');
            // Logic to find the correct file (e.g. latest CSV or XML)
            // For now, let's assume a specific file name or pattern, typically "cennik.csv" or similar
            const targetFile = fileList.find((f: any) => f.name.toLowerCase().includes('cennik') || f.name.toLowerCase().endsWith('.csv'));

            if (!targetFile) {
                throw new Error('No price list file found in directory');
            }

            const buffer = await sftp.get(targetFile.name);
            const content = buffer.toString();

            // Mock parsing logic for Demos Trade CSV (needs actual structure later)
            // Assuming: Code;Name;Price;Unit;...
            const items: SupplierItem[] = [];
            const lines = content.split('\n').slice(1); // skip header

            for (const line of lines) {
                if (!line.trim()) continue;
                const cols = line.split(';');
                if (cols.length < 3) continue;

                items.push({
                    code: cols[0],
                    name: cols[1],
                    price: parseFloat(cols[2].replace(',', '.')),
                    unit: cols[3],
                    category: cols[4] || 'General'
                });
            }

            return items;

        } catch (e) {
            console.error('Fetch items failed:', e);
            throw e;
        } finally {
            await sftp.end();
        }
    }
}
