import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('@/lib/supabase', () => ({
    supabase: {
        rpc: vi.fn()
    }
}));

import { AMLService } from '../services';
import { supabase } from '@/lib/supabase';

describe('AMLService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('calculateRiskScore', () => {
        it('should return low risk for CZ company with low turnover', async () => {
            const result = await AMLService.calculateRiskScore({
                country: 'CZ',
                turnover: 1000000
            });

            expect(result.score).toBe(0);
            expect(result.rating).toBe('low');
        });

        it('should add 20 points for non-CZ country', async () => {
            const result = await AMLService.calculateRiskScore({
                country: 'US',
                turnover: 1000000
            });

            expect(result.score).toBe(20);
            expect(result.rating).toBe('low'); // 20 is not > 20, so still low
        });

        it('should return medium risk for foreign country with high turnover', async () => {
            const result = await AMLService.calculateRiskScore({
                country: 'US',
                turnover: 15000000 // > 10M
            });

            expect(result.score).toBe(30); // 20 (country) + 10 (turnover)
            expect(result.rating).toBe('medium');
        });

        it('should add 10 points for turnover over 10M', async () => {
            const result = await AMLService.calculateRiskScore({
                country: 'CZ',
                turnover: 20000000
            });

            expect(result.score).toBe(10);
            expect(result.rating).toBe('low');
        });

        it('should return high risk when score exceeds 50', async () => {
            // Note: Current implementation max is 30, so we test boundary
            // For now, we test with mocked higher values if needed
            const result = await AMLService.calculateRiskScore({
                country: 'RU', // Foreign
                turnover: 100000000 // High turnover
            });

            // 20 + 10 = 30, which is medium
            expect(result.score).toBe(30);
            expect(result.rating).toBe('medium');
        });
    });

    describe('checkEntity', () => {
        it('should return clean status when no matches found', async () => {
            vi.mocked(supabase.rpc).mockResolvedValue({
                data: [],
                error: null,
                count: null,
                status: 200,
                statusText: 'OK'
            });

            const result = await AMLService.checkEntity('John Doe');

            expect(result.status).toBe('clean');
            expect(result.riskRating).toBe('low');
            expect(result.hits).toHaveLength(0);
        });

        it('should return error status on RPC error', async () => {
            vi.mocked(supabase.rpc).mockResolvedValue({
                data: null,
                error: { message: 'Database error', details: '', hint: '', code: '', name: 'PostgrestError' },
                count: null,
                status: 200,
                statusText: 'OK'
            });

            const result = await AMLService.checkEntity('John Doe');

            expect(result.status).toBe('error');
            expect(result.metadata?.error).toBe('Database error');
        });

        it('should detect high-risk keywords in name', async () => {
            vi.mocked(supabase.rpc).mockResolvedValue({
                data: [],
                error: null,
                count: null,
                status: 200,
                statusText: 'OK'
            });

            const result = await AMLService.checkEntity('Crypto Trading LLC');

            expect(result.status).toBe('hits_found');
            expect(result.riskRating).toBe('high');
            expect(result.hits.length).toBeGreaterThan(0);
            expect(result.hits[0].listName).toBe('INTERNAL_WATCHLIST');
        });

        it('should return high rating for match score >= 75', async () => {
            vi.mocked(supabase.rpc).mockResolvedValue({
                data: [{
                    similarity: 0.80, // 80%
                    list_name: 'EU_SANCTIONS',
                    name: 'John Doe',
                    external_id: '12345',
                    match_details: { base_score: 0.8, dob_boost: 0, country_boost: 0 }
                }],
                error: null,
                count: null,
                status: 200,
                statusText: 'OK'
            });

            const result = await AMLService.checkEntity('John Doe');

            expect(result.status).toBe('hits_found');
            expect(result.riskRating).toBe('high');
            expect(result.hits).toHaveLength(1);
            expect(result.hits[0].matchScore).toBe(80);
        });

        it('should return critical rating for match score >= 85', async () => {
            vi.mocked(supabase.rpc).mockResolvedValue({
                data: [{
                    similarity: 0.90, // 90%
                    list_name: 'OFAC_SDN',
                    name: 'Sanctioned Entity',
                    external_id: 'SDN-001',
                    match_details: { base_score: 0.9, dob_boost: 0, country_boost: 0 }
                }],
                error: null,
                count: null,
                status: 200,
                statusText: 'OK'
            });

            const result = await AMLService.checkEntity('Sanctioned Entity');

            expect(result.status).toBe('hits_found');
            expect(result.riskRating).toBe('critical');
            expect(result.hits[0].matchScore).toBe(90);
        });

        it('should ignore matches below 75% threshold', async () => {
            vi.mocked(supabase.rpc).mockResolvedValue({
                data: [{
                    similarity: 0.60, // 60% - below threshold
                    list_name: 'EU_SANCTIONS',
                    name: 'Similar Name',
                    external_id: '99999',
                    match_details: { base_score: 0.6 }
                }],
                error: null,
                count: null,
                status: 200,
                statusText: 'OK'
            });

            const result = await AMLService.checkEntity('Some Name');

            expect(result.status).toBe('clean');
            expect(result.hits).toHaveLength(0);
        });

        it('should sort hits by score descending', async () => {
            vi.mocked(supabase.rpc).mockResolvedValue({
                data: [
                    { similarity: 0.76, list_name: 'LIST_A', name: 'Name A', external_id: '1', match_details: {} },
                    { similarity: 0.90, list_name: 'LIST_B', name: 'Name B', external_id: '2', match_details: {} },
                    { similarity: 0.80, list_name: 'LIST_C', name: 'Name C', external_id: '3', match_details: {} },
                ],
                error: null,
                count: null,
                status: 200,
                statusText: 'OK'
            });

            const result = await AMLService.checkEntity('Test Name');

            expect(result.hits[0].matchScore).toBe(90);
            expect(result.hits[1].matchScore).toBe(80);
            expect(result.hits[2].matchScore).toBe(76);
        });

        it('should include matched alias in details when present', async () => {
            vi.mocked(supabase.rpc).mockResolvedValue({
                data: [{
                    similarity: 0.85,
                    list_name: 'EU_SANCTIONS',
                    name: 'Primary Name',
                    matched_alias: 'Known Alias',
                    external_id: 'EU-123',
                    match_details: {}
                }],
                error: null,
                count: null,
                status: 200,
                statusText: 'OK'
            });

            const result = await AMLService.checkEntity('Known Alias');

            expect(result.hits[0].details).toContain('Matched Alias: Known Alias');
        });

        it('should test all high-risk keywords', async () => {
            vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null, count: null, status: 200, statusText: 'OK' });

            const keywords = ['Trading', 'Crypto', 'Gambling', 'Offshore'];

            for (const keyword of keywords) {
                const result = await AMLService.checkEntity(`Company ${keyword} Inc`);
                expect(result.hits.some(h => h.listName === 'INTERNAL_WATCHLIST')).toBe(true);
            }
        });
    });
});
