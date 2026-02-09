import { z } from 'zod';
import { NextResponse } from 'next/server';

/**
 * Reusable schema for year query parameter.
 * Coerces string to number, validates range.
 */
export const yearParamSchema = z.coerce
    .number()
    .int()
    .min(2020, 'Year must be >= 2020')
    .max(2100, 'Year must be <= 2100');

/**
 * Returns a 400 JSON response with flattened Zod field errors.
 */
export function validationErrorResponse(error: z.ZodError) {
    return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
    );
}

/**
 * Parses year from searchParams with default to current year.
 * Returns { year } on success, or a 400 NextResponse on failure.
 */
export function parseYearParam(searchParams: URLSearchParams): { year: number } | NextResponse {
    const yearRaw = searchParams.get('year') || new Date().getFullYear().toString();
    const result = yearParamSchema.safeParse(yearRaw);
    if (!result.success) {
        return validationErrorResponse(result.error);
    }
    return { year: result.data };
}
