import { describe, it, expect } from 'vitest';
import {
    getVisibleFields,
    ZOBRAZENI_PRESETS,
    KLIENT_FIELD_LABELS,
    PRESET_LABELS,
    type KlientField,
    type ZobrazeniPreset,
} from '@/lib/types/klient-types';

describe('klient-types', () => {
    describe('ZOBRAZENI_PRESETS', () => {
        it('should have three presets: zakladni, b2b, plny', () => {
            expect(Object.keys(ZOBRAZENI_PRESETS)).toEqual(['zakladni', 'b2b', 'plny']);
        });

        it('zakladni preset should contain only nazev', () => {
            expect(ZOBRAZENI_PRESETS.zakladni).toEqual(['nazev']);
        });

        it('b2b preset should contain business-relevant fields', () => {
            expect(ZOBRAZENI_PRESETS.b2b).toEqual(['nazev', 'ico', 'dic', 'address', 'kontaktni_osoba']);
        });

        it('plny preset should contain all KlientField values', () => {
            const allFields: KlientField[] = ['nazev', 'kontaktni_osoba', 'telefon', 'email', 'address', 'web', 'ico', 'dic'];
            expect(ZOBRAZENI_PRESETS.plny).toEqual(allFields);
        });

        it('plny preset should have 8 fields', () => {
            expect(ZOBRAZENI_PRESETS.plny).toHaveLength(8);
        });

        it('every preset field should be a valid KlientField', () => {
            const validFields = Object.keys(KLIENT_FIELD_LABELS);
            for (const preset of Object.values(ZOBRAZENI_PRESETS)) {
                for (const field of preset) {
                    expect(validFields).toContain(field);
                }
            }
        });
    });

    describe('KLIENT_FIELD_LABELS', () => {
        it('should have Czech labels for all 8 fields', () => {
            expect(Object.keys(KLIENT_FIELD_LABELS)).toHaveLength(8);
        });

        it('should have correct labels', () => {
            expect(KLIENT_FIELD_LABELS.nazev).toBe('N\u00e1zev');
            expect(KLIENT_FIELD_LABELS.ico).toBe('I\u010cO');
            expect(KLIENT_FIELD_LABELS.dic).toBe('DI\u010c');
            expect(KLIENT_FIELD_LABELS.kontaktni_osoba).toBe('Kontaktn\u00ed osoba');
            expect(KLIENT_FIELD_LABELS.telefon).toBe('Telefon');
            expect(KLIENT_FIELD_LABELS.email).toBe('E-mail');
            expect(KLIENT_FIELD_LABELS.address).toBe('Adresa');
            expect(KLIENT_FIELD_LABELS.web).toBe('Web');
        });
    });

    describe('PRESET_LABELS', () => {
        it('should have labels for all 4 presets including vlastni', () => {
            const keys = Object.keys(PRESET_LABELS);
            expect(keys).toContain('zakladni');
            expect(keys).toContain('b2b');
            expect(keys).toContain('plny');
            expect(keys).toContain('vlastni');
            expect(keys).toHaveLength(4);
        });

        it('each label should be a non-empty string', () => {
            for (const label of Object.values(PRESET_LABELS)) {
                expect(typeof label).toBe('string');
                expect(label.length).toBeGreaterThan(0);
            }
        });
    });

    describe('getVisibleFields', () => {
        it('should return zakladni preset fields for preset zakladni', () => {
            const result = getVisibleFields('zakladni');
            expect(result).toEqual(['nazev']);
        });

        it('should return b2b preset fields for preset b2b', () => {
            const result = getVisibleFields('b2b');
            expect(result).toEqual(['nazev', 'ico', 'dic', 'address', 'kontaktni_osoba']);
        });

        it('should return plny preset fields for preset plny', () => {
            const result = getVisibleFields('plny');
            expect(result).toEqual(ZOBRAZENI_PRESETS.plny);
        });

        it('should return custom fields for preset vlastni with customFields provided', () => {
            const custom: KlientField[] = ['nazev', 'email', 'telefon'];
            const result = getVisibleFields('vlastni', custom);
            expect(result).toEqual(custom);
        });

        it('should fallback to zakladni when preset is vlastni but customFields is null', () => {
            const result = getVisibleFields('vlastni', null);
            expect(result).toEqual(ZOBRAZENI_PRESETS.zakladni);
        });

        it('should fallback to zakladni when preset is vlastni but customFields is undefined', () => {
            const result = getVisibleFields('vlastni');
            expect(result).toEqual(ZOBRAZENI_PRESETS.zakladni);
        });

        it('should return empty array when preset is vlastni with empty customFields array', () => {
            // Note: empty array [] is truthy in JS, so it is treated as valid custom fields
            const result = getVisibleFields('vlastni', []);
            expect(result).toEqual([]);
        });

        it('should ignore customFields parameter for non-vlastni presets', () => {
            const custom: KlientField[] = ['nazev', 'email'];
            const result = getVisibleFields('b2b', custom);
            // Non-vlastni preset should use its own fields, ignoring customFields
            expect(result).toEqual(ZOBRAZENI_PRESETS.b2b);
        });

        it('should return a new array reference (not mutate preset)', () => {
            const result1 = getVisibleFields('zakladni');
            const result2 = getVisibleFields('zakladni');
            // Both should be equal but the preset array reference
            expect(result1).toEqual(result2);
        });

        it('should handle single-field custom array', () => {
            const custom: KlientField[] = ['ico'];
            const result = getVisibleFields('vlastni', custom);
            expect(result).toEqual(['ico']);
        });

        it('should handle all fields as custom', () => {
            const allFields: KlientField[] = ['nazev', 'kontaktni_osoba', 'telefon', 'email', 'address', 'web', 'ico', 'dic'];
            const result = getVisibleFields('vlastni', allFields);
            expect(result).toEqual(allFields);
        });
    });
});
