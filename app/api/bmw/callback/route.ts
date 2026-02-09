/**
 * BMW CarData OAuth Callback Handler
 * Handles the OAuth redirect from BMW and exchanges code for tokens
 *
 * Security: CSRF-protected state token, validated against database
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeBMWCode } from '@/lib/bmw-cardata';
import { validateBMWOAuthState } from '@/lib/bmw-oauth-state';
import { createAdminClient } from '@/utils/supabase/admin';
import { createLogger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

const logger = createLogger({ module: 'BMW OAuth Callback' });

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // BMW API returned an error
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Unknown error';
    logger.error('BMW OAuth error', { error, errorDescription });

    return NextResponse.redirect(
      new URL(
        `/flotila?error=bmw_auth_failed&reason=${encodeURIComponent(error)}`,
        req.url
      )
    );
  }

  // Missing required parameters
  if (!code || !state) {
    logger.error('Missing OAuth parameters', { hasCode: !!code, hasState: !!state });
    return NextResponse.redirect(
      new URL('/flotila?error=bmw_auth_invalid', req.url)
    );
  }

  try {
    // Validate CSRF-protected state token
    const vehicleId = await validateBMWOAuthState(state);

    if (!vehicleId) {
      logger.error('Invalid or expired OAuth state token');
      return NextResponse.redirect(
        new URL('/flotila?error=bmw_auth_invalid', req.url)
      );
    }

    // Exchange authorization code for access/refresh tokens
    const tokens = await exchangeBMWCode(code);

    // Calculate token expiry date
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    // Update vehicle with BMW credentials
    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from('vozidla')
      .update({
        bmw_cardata_aktivni: true,
        bmw_access_token: tokens.access_token,
        bmw_refresh_token: tokens.refresh_token,
        bmw_token_expiry: expiryDate.toISOString(),
      })
      .eq('id', vehicleId);

    if (updateError) {
      logger.error('Failed to update vehicle with BMW tokens', {
        vehicleId,
        error: getErrorMessage(updateError)
      });
      throw updateError;
    }

    logger.info('BMW CarData connected successfully', { vehicleId });

    return NextResponse.redirect(
      new URL(`/flotila?success=bmw_connected&vehicle=${vehicleId}`, req.url)
    );
  } catch (error) {
    logger.error('BMW OAuth callback error', { error: getErrorMessage(error) });
    return NextResponse.redirect(
      new URL('/flotila?error=bmw_auth_failed', req.url)
    );
  }
}
