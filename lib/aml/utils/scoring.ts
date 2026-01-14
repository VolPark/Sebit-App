/**
 * Calculates Levenshtein distance between two strings.
 * Returns a score from 0 to 100 (100 = exact match).
 */
export function calculateNameScore(s1: string, s2: string): number {
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();
    if (a === b) return 100;
    if (a.length === 0 || b.length === 0) return 0;

    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    const distance = matrix[b.length][a.length];
    const maxLength = Math.max(a.length, b.length);

    // Convert distance to similarity score (0-100)
    return Math.max(0, Math.round((1 - distance / maxLength) * 100));
}

/**
 * Compares two dates (YYYY-MM-DD or partial).
 * Returns:
 * 100: Exact match
 * 50: Year match only
 * 0: No match
 */
export function calculateDateScore(d1: string | null, d2: string | null): number {
    if (!d1 || !d2) return 0; // If one is missing, no score (neutral)

    // Normalize
    const date1 = new Date(d1);
    const date2 = new Date(d2);

    // Check validity
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return 0;

    const y1 = date1.getFullYear();
    const m1 = date1.getMonth();
    const day1 = date1.getDate();

    const y2 = date2.getFullYear();
    const m2 = date2.getMonth();
    const day2 = date2.getDate();

    if (y1 !== y2) return 0; // Different year = mismatch

    if (m1 === m2 && day1 === day2) return 100; // Exact match

    return 50; // Same year match
}

export function calculateCountryScore(c1: string, c2: string): number {
    if (!c1 || !c2) return 0;
    return c1.toUpperCase() === c2.toUpperCase() ? 100 : 0;
}
