/**
 * BMW CarData OAuth Initiation
 * Generates secure state token and returns BMW authorization URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { generateBMWOAuthState } from '@/lib/bmw-oauth-state';
import { vehicleIdSchema, validationErrorResponse } from '@/lib/api/schemas';
import { createLogger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

const logger = createLogger({ module: 'BMW Auth Initiate' });

export async function POST(req: NextRequest) {
  const session = await verifySession(req);
  if (!session) return unauthorizedResponse();

  try {
    // Zod validation
    const body = await req.json();
    const result = vehicleIdSchema.safeParse(body);

    if (!result.success) {
      return validationErrorResponse(result.error);
    }

    const { vehicleId } = result.data;

    // Check BMW credentials are configured
    const clientId = process.env.BMW_CLIENT_ID;
    const redirectUri = process.env.BMW_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'BMW CarData not configured. Please set BMW_CLIENT_ID and BMW_REDIRECT_URI.' },
        { status: 500 }
      );
    }

    // Generate CSRF-protected state token
    const state = await generateBMWOAuthState(vehicleId);

    // Build BMW authorization URL
    const authUrl = new URL('https://customer.bmwgroup.com/gcdm/oauth/authenticate');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'vehicle_data');

    logger.info('BMW OAuth initiated', { vehicleId });

    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    logger.error('BMW auth initiation error', { error: getErrorMessage(error) });
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
