import { AMLCheckResult, AMLRiskRating, AMLHit } from './types';
import { supabase } from '@/lib/supabase';

const HIGH_RISK_KEYWORDS = ['Trading', 'Crypto', 'Gambling', 'Offshore'];

export const AMLService = {
    /**
     * Performs a check against sanction lists using Database RPC 'match_parties'.
     * Uses Trigram similarity and weighted scoring defined in SQL.
     */
    checkEntity: async (currName: string, dob?: string, country?: string): Promise<AMLCheckResult> => {
        const hits: AMLHit[] = [];
        let riskRating: AMLRiskRating = 'low';

        // 1. Call Database RPC
        // The RPC function expects: query_name, similarity_threshold, query_birth_date, query_country
        const { data: candidates, error } = await supabase.rpc('match_parties', {
            query_name: currName,
            similarity_threshold: 0.4, // Threshold defined in SQL is default 0.4
            query_birth_date: dob || null,
            query_country: country || null
        });

        if (error) {
            console.error('AML Check RPC Error:', error);
            // Return clean result on error to prevent blocking UX, but log it.
            return {
                status: 'error',
                riskRating: 'low',
                hits: [],
                metadata: {
                    checkedAt: new Date().toISOString(),
                    provider: 'SEBIT_DB_ENGINE_PG_TRGM',
                    error: error.message
                }
            };
        }

        if (candidates && candidates.length > 0) {
            candidates.forEach((candidate: any) => {
                const totalScore = Math.round(candidate.similarity * 100);
                const details = candidate.match_details || {};

                // Thresholds - User Request: Only show > 75%
                if (totalScore >= 75) {
                    hits.push({
                        listName: candidate.list_name,
                        matchScore: Math.round(totalScore),
                        matchedName: candidate.name,
                        details: candidate.matched_alias
                            ? `Matched Alias: ${candidate.matched_alias} (ID: ${candidate.external_id})`
                            : `ID: ${candidate.external_id}`,
                        scoring: {
                            nameScore: Math.round((details.base_score || 0) * 100),
                            dobScore: Math.round((details.dob_boost || 0) * 100),
                            countryScore: Math.round((details.country_boost || 0) * 100),
                            totalScore: totalScore
                        },
                        // Pass through enriched details from DB
                        rawDetails: candidate.details
                    });

                    // User Request: > 85% Red (Critical), > 75% Grey (High)
                    if (totalScore >= 85) riskRating = 'critical';
                    else if (totalScore >= 75 && riskRating !== 'critical') riskRating = 'high';
                }
            });
        }

        // 2. Keyword check (Internal fallback)
        const keywordMatch = HIGH_RISK_KEYWORDS.find(k => currName.includes(k));
        if (keywordMatch && (riskRating === 'low' || riskRating === 'medium')) {
            hits.push({
                listName: 'INTERNAL_WATCHLIST',
                matchScore: 80,
                matchedName: keywordMatch,
                details: `Contains high-risk keyword: ${keywordMatch}`,
                scoring: { nameScore: 80, dobScore: 0, countryScore: 0, totalScore: 80 }
            });
            // Only override if not already set to higher level
            if (riskRating === 'low' || riskRating === 'medium') riskRating = 'high';
        }

        // Sort hits by score descending
        hits.sort((a, b) => b.matchScore - a.matchScore);

        return {
            status: hits.length > 0 ? 'hits_found' : 'clean',
            riskRating,
            hits,
            hitsCount: hits.length,
            metadata: {
                checkedAt: new Date().toISOString(),
                provider: 'SEBIT_DB_ENGINE_PG_TRGM'
            }
        };
    },

    /**
     * Calculates score based on profile (Risk Engine placeholder).
     */
    calculateRiskScore: async (profileData: any): Promise<{ score: number, rating: AMLRiskRating }> => {
        let score = 0;
        if (profileData.country !== 'CZ') score += 20;
        if (profileData.turnover > 10000000) score += 10;

        let rating: AMLRiskRating = 'low';
        if (score > 50) rating = 'high';
        else if (score > 20) rating = 'medium';

        return { score, rating };
    }
};
