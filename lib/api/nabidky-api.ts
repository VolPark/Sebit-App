import { supabase } from '@/lib/supabase';
import { Nabidka, CreateOfferItemPayload, UpdateOfferItemPayload, CreateActionPayload } from '@/lib/types/nabidky-types';
import { createLogger } from '@/lib/logger';

const log = createLogger({ module: 'Nabidky' });

export const getNabidky = async (divisionId?: number | null): Promise<Nabidka[]> => {
    let query = supabase
        .from('nabidky')
        .select(`
      *,
      cislo,
        division_id,
        divisions (
          id,
          nazev
        ),
        klienti (
          id,
          nazev,
          kontaktni_osoba,
          telefon,
          email,
          address,
          web,
          ico,
          dic
        ),
        akce (
          id,
          nazev
        ),
        nabidky_stavy (
          id,
          nazev,
          color
        )
      `)
        .order('created_at', { ascending: false });

    if (divisionId) {
        query = query.eq('division_id', divisionId);
    }

    const { data, error } = await query;

    if (error) {
        log.error('Error fetching nabidky:', error);
        return [];
    }

    return data as Nabidka[];
};

export const createNabidka = async (offer: Partial<Nabidka>) => {
    const { data, error } = await supabase
        .from('nabidky')
        .insert([offer])
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
};

export const updateNabidka = async (id: number, updates: Partial<Nabidka>) => {
    const { data, error } = await supabase
        .from('nabidky')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
};

export const deleteNabidka = async (id: number) => {
    const { error } = await supabase
        .from('nabidky')
        .delete()
        .eq('id', id);

    if (error) {
        throw error;
    }
};

export const getNabidkaById = async (id: number): Promise<Nabidka | null> => {
    const { data, error } = await supabase
        .from('nabidky')
        .select(`
      *,
      cislo,
      division_id,
      divisions (
        id,
        nazev
      ),
      klienti (
        id,
        nazev,
        kontaktni_osoba,
        telefon,
        email,
        address,
        web,
        ico,
        dic
      ),
      akce (
        id,
        nazev
      ),
      nabidky_stavy (
        id,
        nazev,
        color
      )
    `)
        .eq('id', id)
        .single();

    if (error) {
        log.error('Error fetching nabidka:', error);
        return null;
    }

    return data as Nabidka;
};

// --- Clients & Actions Helper for Offers ---

export const getClients = async () => {
    const { data } = await supabase.from('klienti').select('id, nazev, kontaktni_osoba, telefon, email, address, web, ico, dic').order('nazev');
    return data || [];
};

export const createClient = async (name: string) => {
    const { data, error } = await supabase.from('klienti').insert([{ nazev: name }]).select('id, nazev, kontaktni_osoba, telefon, email, address, web, ico, dic').single();
    if (error) throw error;
    return data;
};

export const getActions = async () => {
    const { data } = await supabase.from('akce').select('id, nazev, klient_id').order('nazev');
    return data || [];
};

export const createAction = async (action: CreateActionPayload) => {
    const payload: Record<string, unknown> = {
        nazev: action.nazev,
        is_completed: false,
        datum: new Date().toISOString(),
        cena_klient: action.cena_klient || 0,
        odhad_hodin: action.odhad_hodin || 0,
        material_klient: action.material_klient || 0,
        material_my: action.material_my || 0,
    };
    if (action.klient_id) payload.klient_id = action.klient_id;

    const { data, error } = await supabase.from('akce').insert([payload]).select('id, nazev, klient_id').single();
    if (error) throw error;
    return data;
};

export const getStatuses = async () => {
    const { data } = await supabase.from('nabidky_stavy').select('*').order('poradi');
    return data || [];
};

export const getItemTypes = async () => {
    const { data } = await supabase.from('polozky_typy').select('id, nazev').order('nazev');
    return data || [];
};

export const createItemType = async (type: string) => {
    const { data, error } = await supabase.from('polozky_typy').insert([{ nazev: type }]).select('id, nazev').single();
    if (error) throw error;
    return data;
};

export const getDivisionsList = async () => {
    const { data } = await supabase.from('divisions').select('id, nazev').order('id');
    return data || [];
};

// --- Offer Items (Položky) ---

export const getOfferItems = async (nabidkaId: number) => {
    const { data } = await supabase
        .from('polozky_nabidky')
        .select('*')
        .eq('nabidka_id', nabidkaId)
        .order('poradi', { ascending: true });
    return data || [];
};

export const createOfferItem = async (item: CreateOfferItemPayload) => {
    // Get max poradi for this offer to append new item at end
    const { data: maxData } = await supabase
        .from('polozky_nabidky')
        .select('poradi')
        .eq('nabidka_id', item.nabidka_id)
        .order('poradi', { ascending: false })
        .limit(1);
    const maxPoradi = maxData?.[0]?.poradi || 0;

    log.debug('CreateOfferItem payload:', item);
    const { data, error } = await supabase
        .from('polozky_nabidky')
        .insert([{ ...item, poradi: maxPoradi + 1 }])
        .select()
        .single();

    if (error) {
        log.error('Supabase Create Item Error:', error);
        throw error;
    }

    await updateOfferTotalPrice(item.nabidka_id);
    return data;
};

export const deleteOfferItem = async (id: number, nabidkaId: number) => {
    const { error } = await supabase.from('polozky_nabidky').delete().eq('id', id);
    if (error) throw error;

    await updateOfferTotalPrice(nabidkaId);
};

export const updateOfferTotalPrice = async (nabidkaId: number) => {
    // Calculate subtotal from all items (including negative discount items)
    const { data: itemsData } = await supabase
        .from('polozky_nabidky')
        .select('celkem')
        .eq('nabidka_id', nabidkaId);

    const subtotal = itemsData?.reduce((sum, item) => sum + (Number(item.celkem) || 0), 0) || 0;

    // Fetch global discount percentage
    const { data: offerData } = await supabase
        .from('nabidky')
        .select('sleva_procenta')
        .eq('id', nabidkaId)
        .single();

    const slevaProcenta = Number(offerData?.sleva_procenta) || 0;
    const total = Math.max(0, subtotal * (1 - slevaProcenta / 100));

    // Update Offer
    const { error: updateError } = await supabase.from('nabidky').update({ celkova_cena: total }).eq('id', nabidkaId);
    if (updateError) {
        log.error('Error updating offer total price:', updateError);
        throw updateError;
    }
};

export const uploadOfferImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('offer-images')
        .upload(filePath, file);

    if (uploadError) {
        log.error('Error uploading image:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('offer-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
};

export const updateOfferItem = async (id: number, updates: UpdateOfferItemPayload) => {
    const { data, error } = await supabase
        .from('polozky_nabidky')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        log.error('Error updating item:', error);
        throw error;
    }

    if (data && data.nabidka_id) {
        await updateOfferTotalPrice(data.nabidka_id);
    }

    return data;
};

// --- Reorder Items (Drag & Drop) ---

export const reorderOfferItems = async (items: Array<{ id: number; poradi: number }>) => {
    const updates = items.map(item =>
        supabase
            .from('polozky_nabidky')
            .update({ poradi: item.poradi })
            .eq('id', item.id)
    );
    await Promise.all(updates);
};
