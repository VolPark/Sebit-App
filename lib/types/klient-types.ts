export interface Klient {
  id: number;
  nazev: string;
  kontaktni_osoba?: string | null;
  telefon?: string | null;
  email?: string | null;
  address?: string | null;
  web?: string | null;
  ico?: string | null;
  dic?: string | null;
  sazba?: number | null;
  poznamka?: string | null;
  organization_id?: string | null;
}

/** Pole klienta zobrazitelná v PDF nabídky */
export type KlientField = 'nazev' | 'kontaktni_osoba' | 'telefon' | 'email' | 'address' | 'web' | 'ico' | 'dic';

/** Typ presetu zobrazení klientských údajů */
export type ZobrazeniPreset = 'zakladni' | 'b2b' | 'plny' | 'vlastni';

/** České popisky polí klienta */
export const KLIENT_FIELD_LABELS: Record<KlientField, string> = {
  nazev: 'Název',
  kontaktni_osoba: 'Kontaktní osoba',
  telefon: 'Telefon',
  email: 'E-mail',
  address: 'Adresa',
  web: 'Web',
  ico: 'IČO',
  dic: 'DIČ',
};

/** Předdefinované kolekce polí pro jednotlivé presety */
export const ZOBRAZENI_PRESETS: Record<Exclude<ZobrazeniPreset, 'vlastni'>, KlientField[]> = {
  zakladni: ['nazev'],
  b2b: ['nazev', 'ico', 'dic', 'address', 'kontaktni_osoba'],
  plny: ['nazev', 'kontaktni_osoba', 'telefon', 'email', 'address', 'web', 'ico', 'dic'],
};

/** České popisky presetů */
export const PRESET_LABELS: Record<ZobrazeniPreset, string> = {
  zakladni: 'Základní (jen název)',
  b2b: 'B2B (IČO, DIČ, adresa, kontakt)',
  plny: 'Plný (všechny údaje)',
  vlastni: 'Vlastní výběr',
};

/** Vrátí pole k zobrazení na základě presetu */
export function getVisibleFields(
  preset: ZobrazeniPreset,
  customFields?: KlientField[] | null
): KlientField[] {
  if (preset === 'vlastni' && customFields) {
    return customFields;
  }
  return ZOBRAZENI_PRESETS[preset === 'vlastni' ? 'zakladni' : preset];
}
