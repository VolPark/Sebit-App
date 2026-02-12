
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decodeVIN, isValidVIN, isBMW } from '../vin-decoder';

// Mock fetch for NHTSA
global.fetch = vi.fn();

describe('VIN Decoder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should validate VIN format', () => {
        expect(isValidVIN('TMBJJ7NE9H0123456')).toBe(true);
        expect(isValidVIN('INVALID')).toBe(false); // Too short
        expect(isValidVIN('TMBJJ7NE9H012345I')).toBe(false); // Contains I
    });

    it('should identify BMW', () => {
        expect(isBMW('WBA123...')).toBe(true);
        expect(isBMW('TMB...')).toBe(false);
    });

    it('should decode Skoda locally (hybrid preference)', async () => {
        // Skoda Octavia VIN
        const vin = 'TMBJJ7NE9H0123456';

        // Even if NHTSA fails or returns garbage, local should work
        vi.mocked(global.fetch).mockResolvedValue({
            ok: false, // Simulate API failure
        } as Response);

        const result = await decodeVIN(vin);
        expect(result.success).toBe(true);
        expect(result.data?.znacka).toBe('Škoda');
        expect(result.data?.model).toBe('Octavia IV (Hybrid/RS)');
        expect(result.data?.source).toBe('Local');
    });

    it('should fallback to NHTSA for unknown cars', async () => {
        // Tesla VIN
        const vin = '5YJ3E1EA5KF000000';

        vi.mocked(global.fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                Results: [
                    { VariableId: 26, Value: 'TESLA' }, // Make
                    { VariableId: 28, Value: 'Model 3' }, // Model
                    { VariableId: 29, Value: '2019' }, // Year
                ]
            })
        } as Response);

        const result = await decodeVIN(vin);
        expect(result.success).toBe(true);
        expect(result.data?.znacka).toBe('Tesla'); // From local WMI list
        expect(result.data?.model).toBe('Model 3'); // From NHTSA
        expect(result.data?.source).toBe('NHTSA'); // Source updated because model came from NHTSA
    });

    it('should handle API failure gracefully', async () => {
        // Unknown VIN, API fails
        const vin = '11111111111111111';
        vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);

        const result = await decodeVIN(vin);
        expect(result.success).toBe(false);
    });
});
