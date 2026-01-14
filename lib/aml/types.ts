export type AMLSanctionList = 'EU' | 'UN' | 'OFAC' | 'CZ' | 'INTERNAL_WATCHLIST';

export type AMLRiskRating = 'low' | 'medium' | 'high' | 'critical';

export interface AMLScoringBreakdown {
    nameScore: number;
    dobScore: number;
    countryScore: number;
    totalScore: number;
}

export interface AMLHit {
    listName: string;
    matchScore: number;
    matchedName: string;
    details?: string;
    scoring?: AMLScoringBreakdown;
    // Enhanced Context
    rawDetails?: {
        entityInfo?: {
            designationDate?: string;
            designationDetails?: string;
            logicalId?: string;
            unitedNationId?: string;
            subjectType?: string;
            subjectClassification?: string;
        };
        nameAliases?: Array<{
            wholeName: string;
            firstName?: string;
            lastName?: string;
            function?: string;
            gender?: string;
            title?: string;
            language?: string;
            isStrong?: boolean;
        }>;
        birthDates?: Array<{
            date?: string;
            city?: string;
            country?: string;
            countryIso?: string;
            place?: string;
            region?: string;
            remark?: string;
        }>;
        citizenships?: Array<{
            country?: string;
            countryIso?: string;
            region?: string;
        }>;
        addresses?: Array<{
            street?: string;
            city?: string;
            zip?: string;
            country?: string;
            countryIso?: string;
            place?: string;
        }>;
        identifications?: Array<{
            type?: string;
            number?: string;
            country?: string;
            countryIso?: string;
            issuedBy?: string;
            issueDate?: string;
        }>;
        regulations?: Array<{
            title?: string;
            url?: string;
            date?: string;
            type?: string;
        }>;
        remarks?: string[];
    };
}

export interface AMLCheckResult {
    status: 'clean' | 'hits_found' | 'error';
    riskRating: AMLRiskRating;
    hits: AMLHit[];
    hitsCount?: number; // Added this field
    metadata?: {
        checkedAt: string;
        provider: string; // 'SEBIT_SCORING_ENGINE_V2' or 'SEBIT_DB_ENGINE_PG_TRGM'
        error?: string;
        rpc_latency?: string;
    };
}
