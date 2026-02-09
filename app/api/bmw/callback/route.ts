/**
 * BMW CarData OAuth Callback Handler
 * Handles the OAuth redirect from BMW and exchanges code for tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { exchangeBMWCode } from '@/lib/bmw-cardata';
import { createAdminClient } from '@/utils/supabase/admin';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/flotila?error=bmw_auth_failed&reason=${error}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/flotila?error=bmw_auth_invalid', req.url)
    );
  }

  try {
    // State should contain: vehicleId
    const vehicleId = parseInt(state);

    if (isNaN(vehicleId)) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const tokens = await exchangeBMWCode(code);

    // Calculate expiry date
    const expiryDate = new Date(Date.now() + tokens.expires_in * 1000);

    // Update vehicle with BMW tokens
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
      throw updateError;
    }

    return NextResponse.redirect(
      new URL(`/flotila?success=bmw_connected&vehicle=${vehicleId}`, req.url)
    );
  } catch (error) {
    console.error('BMW OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/flotila?error=bmw_auth_failed', req.url)
    );
  }
}
