/**
 * BMW CarData (Connected Drive) Integration
 *
 * Setup instructions:
 * 1. Register at: https://developer.bmw.com/
 * 2. Create application and get CLIENT_ID and CLIENT_SECRET
 * 3. Add redirect URI: {APP_URL}/api/bmw/callback
 * 4. Add to .env.local:
 *    BMW_CLIENT_ID="your-client-id"
 *    BMW_CLIENT_SECRET="your-client-secret"
 *    BMW_REDIRECT_URI="https://your-domain.com/api/bmw/callback"
 */

export interface BMWToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface BMWVehicle {
  vin: string;
  model: string;
  year: number;
  color: string;
  licensePlate?: string;
}

export interface BMWVehicleStatus {
  mileage: number; // km
  fuelLevel?: number; // percentage
  fuelRange?: number; // km
  batteryLevel?: number; // percentage (for electric/hybrid)
  batteryRange?: number; // km
  location?: {
    latitude: number;
    longitude: number;
  };
  doorLockState?: 'LOCKED' | 'UNLOCKED';
  windowsState?: 'CLOSED' | 'OPEN';
  lastUpdate: string; // ISO timestamp
}

const BMW_API_BASE = 'https://api.bmw.com';
const BMW_AUTH_BASE = 'https://customer.bmwgroup.com/gcdm/oauth';

/**
 * Generate BMW OAuth authorization URL
 */
export function getBMWAuthURL(state: string): string {
  const clientId = process.env.BMW_CLIENT_ID;
  const redirectUri = process.env.BMW_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('BMW_CLIENT_ID and BMW_REDIRECT_URI must be configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'vehicle_data remote_services',
    state,
  });

  return `${BMW_AUTH_BASE}/authenticate?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeBMWCode(code: string): Promise<BMWToken> {
  const clientId = process.env.BMW_CLIENT_ID;
  const clientSecret = process.env.BMW_CLIENT_SECRET;
  const redirectUri = process.env.BMW_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('BMW OAuth credentials not configured');
  }

  const response = await fetch(`${BMW_AUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`BMW token exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Refresh BMW access token using refresh token
 */
export async function refreshBMWToken(refreshToken: string): Promise<BMWToken> {
  const clientId = process.env.BMW_CLIENT_ID;
  const clientSecret = process.env.BMW_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('BMW OAuth credentials not configured');
  }

  const response = await fetch(`${BMW_AUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`BMW token refresh failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get list of vehicles for authenticated user
 */
export async function getBMWVehicles(accessToken: string): Promise<BMWVehicle[]> {
  const response = await fetch(`${BMW_API_BASE}/v1/user/vehicles`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch BMW vehicles: ${response.status}`);
  }

  const data = await response.json();
  return data.vehicles || [];
}

/**
 * Get vehicle status (mileage, fuel, location, etc.)
 */
export async function getBMWVehicleStatus(
  accessToken: string,
  vin: string
): Promise<BMWVehicleStatus> {
  const response = await fetch(`${BMW_API_BASE}/v1/user/vehicles/${vin}/status`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch BMW vehicle status: ${response.status}`);
  }

  const data = await response.json();

  return {
    mileage: data.vehicleStatus?.mileage || 0,
    fuelLevel: data.vehicleStatus?.fuelPercent,
    fuelRange: data.vehicleStatus?.remainingRangeKm,
    batteryLevel: data.vehicleStatus?.chargingState?.chargePercentage,
    batteryRange: data.vehicleStatus?.chargingState?.remainingRangeKm,
    location: data.vehicleStatus?.position ? {
      latitude: data.vehicleStatus.position.latitude,
      longitude: data.vehicleStatus.position.longitude,
    } : undefined,
    doorLockState: data.vehicleStatus?.doorLockState,
    windowsState: data.vehicleStatus?.windowsState,
    lastUpdate: data.vehicleStatus?.updateTime || new Date().toISOString(),
  };
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiryDate: string): boolean {
  return new Date(expiryDate) <= new Date();
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidBMWToken(
  accessToken: string,
  refreshToken: string,
  expiryDate: string
): Promise<{ accessToken: string; refreshToken: string; expiryDate: string }> {
  if (!isTokenExpired(expiryDate)) {
    return { accessToken, refreshToken, expiryDate };
  }

  // Token expired, refresh it
  const newToken = await refreshBMWToken(refreshToken);
  const newExpiryDate = new Date(Date.now() + newToken.expires_in * 1000).toISOString();

  return {
    accessToken: newToken.access_token,
    refreshToken: newToken.refresh_token,
    expiryDate: newExpiryDate,
  };
}
