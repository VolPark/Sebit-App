import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySession, unauthorizedResponse } from '@/lib/api/auth';
import { lookupByVIN, mapPalivoToTypPaliva, parseRsvDate } from '@/lib/vehicles/czech-vehicle-api';
import { createAdminClient } from '@/utils/supabase/admin';
import { createLogger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/errors';

const logger = createLogger({ module: 'VIN Lookup API' });

const vinLookupSchema = z.object({
  vin: z.string().length(17, 'VIN musí mít přesně 17 znaků').regex(
    /^[A-HJ-NPR-Z0-9]{17}$/i,
    'Neplatný formát VIN'
  ),
  vehicleId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const session = await verifySession(req);
  if (!session) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = vinLookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { vin, vehicleId } = parsed.data;

    const result = await lookupByVIN(vin.toUpperCase());

    if (result.Status !== 1 || !result.Data) {
      return NextResponse.json(
        { error: 'Vozidlo nenalezeno v registru', status: result.Status },
        { status: 404 }
      );
    }

    // If vehicleId provided, save vin_data to database
    if (vehicleId) {
      const supabase = createAdminClient();
      const { error: updateError } = await supabase
        .from('vozidla')
        .update({
          vin_data: result.Data,
          vin_data_fetched_at: new Date().toISOString(),
        })
        .eq('id', vehicleId);

      if (updateError) {
        logger.error('Failed to save vin_data', { vehicleId, error: updateError.message });
      } else {
        logger.info('Saved vin_data for vehicle', { vehicleId });
      }
    }

    // Extract mapped fields for form auto-fill
    const mapped = {
      znacka: result.Data.TovarniZnacka || null,
      model: result.Data.ObchodniOznaceni || null,
      barva: result.Data.VozidloKaroserieBarva || null,
      typ_paliva: mapPalivoToTypPaliva(
        result.Data.Palivo,
        result.Data.VozidloElektricke as string,
        result.Data.VozidloHybridni as string
      ),
      stk_do: parseRsvDate(result.Data.PravidelnaTechnickaProhlidkaDo as string),
      datum_prvni_registrace: parseRsvDate(result.Data.DatumPrvniRegistrace as string),
      status: result.Data.StatusNazev || null,
    };

    return NextResponse.json({
      success: true,
      data: result.Data,
      mapped,
    });
  } catch (error: unknown) {
    logger.error('VIN lookup failed', { error: getErrorMessage(error) });
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
