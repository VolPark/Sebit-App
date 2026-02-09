/**
 * BMW OAuth State Management
 * Generates and validates CSRF-protected state parameters for BMW OAuth flow
 */

import { createAdminClient } from '@/utils/supabase/admin';
import { randomBytes } from 'crypto';

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export interface BMWOAuthState {
    vehicleId: number;
    csrf: string;
    timestamp: number;
}

/**
 * Generate a secure OAuth state token and store it in database
 */
export async function generateBMWOAuthState(vehicleId: number): Promise<string> {
    const csrf = randomBytes(32).toString('hex');
    const timestamp = Date.now();

    const state: BMWOAuthState = {
        vehicleId,
        csrf,
        timestamp,
    };

    // Store state in database for validation
    const supabase = createAdminClient();
    await supabase.from('bmw_oauth_states').insert({
        csrf_token: csrf,
        vehicle_id: vehicleId,
        created_at: new Date().toISOString(),
        expires_at: new Date(timestamp + STATE_EXPIRY_MS).toISOString(),
    });

    return Buffer.from(JSON.stringify(state)).toString('base64url');
}

/**
 * Validate and consume OAuth state token
 * Returns vehicleId if valid, null if invalid/expired
 */
export async function validateBMWOAuthState(stateToken: string): Promise<number | null> {
    try {
        // Decode state
        const decoded = Buffer.from(stateToken, 'base64url').toString('utf-8');
        const state: BMWOAuthState = JSON.parse(decoded);

        // Check timestamp
        if (Date.now() - state.timestamp > STATE_EXPIRY_MS) {
            return null; // Expired
        }

        // Validate CSRF token in database
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('bmw_oauth_states')
            .select('vehicle_id, expires_at')
            .eq('csrf_token', state.csrf)
            .eq('vehicle_id', state.vehicleId)
            .single();

        if (error || !data) {
            return null; // Token not found or invalid
        }

        // Check database expiry
        if (new Date(data.expires_at) < new Date()) {
            return null; // Expired in database
        }

        // Delete token to prevent reuse (consume it)
        await supabase.from('bmw_oauth_states').delete().eq('csrf_token', state.csrf);

        return state.vehicleId;
    } catch {
        return null; // Parsing or validation error
    }
}

/**
 * Clean up expired OAuth state tokens (should be run by cron)
 */
export async function cleanExpiredBMWOAuthStates(): Promise<void> {
    const supabase = createAdminClient();
    await supabase.from('bmw_oauth_states').delete().lt('expires_at', new Date().toISOString());
}
