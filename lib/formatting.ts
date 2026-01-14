export const getRateUnit = (): string => {
    const mode = process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE || 'HOURLY';
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Kč';
    if (mode === 'MANDAY') {
        return `${currency}/MD`;
    }
    return `${currency}/h`;
};

export const formatRateValue = (hourlyRate: number): string => {
    const mode = process.env.NEXT_PUBLIC_RATE_DISPLAY_MODE || 'HOURLY';

    let rate = hourlyRate;
    if (mode === 'MANDAY') {
        // 1 MD = 8 hours
        rate = hourlyRate * 8;
    }

    return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(rate);
};

export const formatRate = (hourlyRate: number): string => {
    return `${formatRateValue(hourlyRate)} ${getRateUnit()}`;
};
