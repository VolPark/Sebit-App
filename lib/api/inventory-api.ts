import { supabase } from '@/lib/supabase';

// Inventory Items
export type InventoryItem = {
    id: number;
    name: string;
    description: string | null;
    ean: string | null;
    sku: string | null;
    quantity: number;
    unit: string;
    min_quantity: number;
    avg_price: number;
    location: string | null;
    supplier_item_id: number | null;
    manufacturer: string | null;
    image_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type InventoryMovement = {
    id: number;
    inventory_item_id: number;
    type: 'RECEIPT' | 'ISSUE' | 'AUDIT' | 'RETURN' | 'TRANSFER';
    quantity: number;
    quantity_change: number;
    price: number | null;
    reference_number: string | null;
    note: string | null;
    action_id: number | null;
    user_id: string | null;
    created_at: string;
    // Joins
    inventory_items?: InventoryItem;
    akce?: { id: number; nazev: string };
    profiles?: { email: string };
};

export const getInventoryItems = async () => {
    const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data as InventoryItem[];
};

export const getInventoryItemById = async (id: number) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as InventoryItem;
};

export const getInventoryItemByEan = async (ean: string) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('ean', ean)
        .eq('is_active', true)
        .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    return data as InventoryItem | null;
};

export const searchInventoryItems = async (query: string) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(10); // Limit to top 10 suggestions

    if (error) throw error;
    return data as InventoryItem[];
};

export const createInventoryItem = async (item: Partial<InventoryItem>) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .insert([item])
        .select()
        .single();

    if (error) throw error;
    return data as InventoryItem;
};

export const updateInventoryItem = async (id: number, updates: Partial<InventoryItem>) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data as InventoryItem;
};

// Movements
export const createMovement = async (movement: Partial<InventoryMovement>) => {
    // 1. Create Movement
    const { data, error } = await supabase
        .from('inventory_movements')
        .insert([movement])
        .select()
        .single();

    if (error) throw error;

    // 2. Update Item Quantity (Trigger could do this, but doing it explicitly for now to ensure atomicity if no trigger)
    // Actually, handling this in application logic is safer if no stored procedures.
    // Calculate new quantity
    if (movement.inventory_item_id && movement.quantity_change) {
        // Fetch current to be safe? Or just atomic update?
        // Supabase/Postgres atomic update: quantity = quantity + val
        // But we need to update avg_price if it's a receipt... that's complex.
        // For MVP, let's just update quantity.

        /* 
           TODO: Valuation Logic (Weighted Average Cost)
           If RECEIPT (quantity_change > 0):
             NewAvg = ((OldQty * OldAvg) + (NewQty * BuyPrice)) / (OldQty + NewQty)
        */

        // Simple increment for now
        // We can use an RPC for this later.

        // Let's read the item first to calculate properly
        const { data: item } = await supabase.from('inventory_items').select('quantity, avg_price').eq('id', movement.inventory_item_id).single();

        if (item) {
            let updates: any = {
                quantity: item.quantity + (movement.quantity_change || 0)
            };

            // Recalculate Average Price on RECEIPT
            if (movement.type === 'RECEIPT' && movement.price && movement.quantity_change > 0) {
                const totalValue = (item.quantity * (item.avg_price || 0)) + (movement.quantity_change * movement.price);
                const newQty = item.quantity + movement.quantity_change;
                updates.avg_price = newQty > 0 ? totalValue / newQty : 0;
            }

            await supabase.from('inventory_items').update(updates).eq('id', movement.inventory_item_id);
        }
    }

    return data;
};

export const getMovements = async (itemId?: number, limit = 50) => {
    let query = supabase
        .from('inventory_movements')
        .select(`
            *,
            inventory_items (name, unit),
            akce (nazev)
        `) // Note: user relation removed due to auth.users visibility issues
        .order('created_at', { ascending: false })
        .limit(limit);

    if (itemId) {
        query = query.eq('inventory_item_id', itemId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const uploadInventoryImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Ensure bucket exists or use a shared one. 
    // Using 'inventory-images' bucket. User must ensure it exists.
    const { error: uploadError } = await supabase.storage
        .from('inventory-images')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('inventory-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
};
