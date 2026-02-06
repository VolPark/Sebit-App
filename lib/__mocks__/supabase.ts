import { vi } from 'vitest';

// Mock Supabase query builder chain
const createMockQueryBuilder = (data: any = [], error: any = null) => {
    const builder: any = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
        maybeSingle: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
        then: vi.fn((resolve) => resolve({ data, error })),
    };

    // Make it thenable
    builder[Symbol.toStringTag] = 'Promise';

    return builder;
};

// Mock RPC responses
const mockRpcResponses: Record<string, any> = {};

// Create mock supabase client
export const createMockSupabase = () => {
    const mockData: Record<string, any[]> = {};

    return {
        from: vi.fn((table: string) => {
            return createMockQueryBuilder(mockData[table] || []);
        }),
        rpc: vi.fn((funcName: string, params?: any) => {
            return Promise.resolve({
                data: mockRpcResponses[funcName] || [],
                error: null
            });
        }),
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        },
        // Helper to set mock data
        __setMockData: (table: string, data: any[]) => {
            mockData[table] = data;
        },
        __setRpcResponse: (funcName: string, data: any) => {
            mockRpcResponses[funcName] = data;
        },
        __clearMocks: () => {
            Object.keys(mockData).forEach(key => delete mockData[key]);
            Object.keys(mockRpcResponses).forEach(key => delete mockRpcResponses[key]);
        }
    };
};

// Default mock instance
export const supabase = createMockSupabase();

// Export for vi.mock usage
export default { supabase, createMockSupabase };
