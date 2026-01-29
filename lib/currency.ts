import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// CNB Daily URL
// Format: https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt?date=DD.MM.YYYY
const CNB_API_URL = 'https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt';

export async function getExchangeRate(dateStr: string, currency: string): Promise<number> {
    if (currency === 'CZK') return 1;

    // 1. Check Cache (DB)
    const { data: cached } = await supabase
        .from('currency_rates')
        .select('rate')
        .eq('date', dateStr)
        .eq('currency', currency)
        .single();

    if (cached) {
        return cached.rate;
    }

    // 2. Fetch from CNB
    const dateObj = new Date(dateStr);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;

    logger.currency.debug(`Fetching CNB rates for ${formattedDate}...`);

    try {
        const response = await fetch(`${CNB_API_URL}?date=${formattedDate}`);
        if (!response.ok) throw new Error('Failed to fetch rates');

        const text = await response.text();
        const lines = text.split('\n');

        // Parse lines. Skip first 2 lines (header).
        // Format: zem|mena|mnozstvi|kod|kurz
        // Australia|dollar|1|AUD|15.50

        let foundRate: number | null = null;
        let cnbAmount = 1;

        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split('|');
            if (parts.length < 5) continue;

            const code = parts[3];
            const amount = parseFloat(parts[2].replace(',', '.'));
            const rateStr = parts[4].replace(',', '.');
            const rate = parseFloat(rateStr);

            if (code === currency) {
                foundRate = rate;
                cnbAmount = amount;

                // Save to DB (cache this specific rate)
                // We calculate Unit Rate: rate / amount
                const unitRate = rate / amount;

                // Optimistically insert
                await supabase.from('currency_rates').upsert({
                    date: dateStr,
                    currency: code,
                    rate: unitRate,
                    amount: amount
                });

                return unitRate;
            }
        }

        if (foundRate === null) {
            logger.currency.warn(`Currency ${currency} not found in CNB list for ${dateStr}. Using generic fallback.`);
            // Fallback or throw? 
            // Throw might block UI. Return 0 or fallback?
            // Let's fallback to approx map if recent?
            return 0;
        }

    } catch (e) {
        logger.currency.error('CNB Fetch Error:', e);
        return 0;
    }

    return 0;
}
