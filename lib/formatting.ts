export const formatRate = (hourlyRate: number): string => {
    const mode = process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE || 'HOURLY';
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Kč';

    if (mode === 'MANDAY') {
        // 1 MD = 8 hours
        const mandayRate = hourlyRate * 8;
        return `${new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(mandayRate)} ${currency}/MD`;
    }

    return `${new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(hourlyRate)} ${currency}/h`;
};
