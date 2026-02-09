/**
 * BMW CarData Status Sync
 * Fetches latest vehicle status from BMW API and updates database
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { createAdminClient } from '@/utils/supabase/admin';
import { getBMWVehicleStatus, getValidBMWToken } from '@/lib/bmw-cardata';
import { getErrorMessage } from '@/lib/errors';

export async function POST(req: NextRequest) {
  const session = await verifySession(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { vehicleId } = body;

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get vehicle with BMW tokens
    const { data: vehicle, error: fetchError } = await supabase
      .from('vozidla')
      .select('id, vin, bmw_cardata_aktivni, bmw_access_token, bmw_refresh_token, bmw_token_expiry')
      .eq('id', vehicleId)
      .single();

    if (fetchError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    if (!vehicle.bmw_cardata_aktivni) {
      return NextResponse.json(
        { error: 'BMW CarData not enabled for this vehicle' },
        { status: 400 }
      );
    }

    if (!vehicle.bmw_access_token || !vehicle.bmw_refresh_token || !vehicle.bmw_token_expiry) {
      return NextResponse.json(
        { error: 'BMW tokens not configured. Please connect vehicle first.' },
        { status: 400 }
      );
    }

    // Get valid token (refresh if needed)
    const { accessToken, refreshToken, expiryDate } = await getValidBMWToken(
      vehicle.bmw_access_token,
      vehicle.bmw_refresh_token,
      vehicle.bmw_token_expiry
    );

    // Update tokens in DB if refreshed
    if (accessToken !== vehicle.bmw_access_token) {
      await supabase
        .from('vozidla')
        .update({
          bmw_access_token: accessToken,
          bmw_refresh_token: refreshToken,
          bmw_token_expiry: expiryDate,
        })
        .eq('id', vehicleId);
    }

    // Fetch vehicle status from BMW API
    const status = await getBMWVehicleStatus(accessToken, vehicle.vin);

    // Update vehicle mileage in database
    await supabase
      .from('vozidla')
      .update({
        najezd_km: status.mileage,
      })
      .eq('id', vehicleId);

    return NextResponse.json({
      success: true,
      status: {
        mileage: status.mileage,
        fuelLevel: status.fuelLevel,
        fuelRange: status.fuelRange,
        batteryLevel: status.batteryLevel,
        batteryRange: status.batteryRange,
        lastUpdate: status.lastUpdate,
      },
    });
  } catch (error) {
    console.error('BMW sync error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
