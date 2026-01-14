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
    // Relations
    stocks?: InventoryStock[];
};

export type InventoryCenter = {
    id: number;
    name: string;
    color: string | null;
};

export type InventoryStock = {
    id: number;
    inventory_item_id: number;
    center_id: number;
    quantity: number;
    centers?: InventoryCenter;
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
    center_id: number | null;
    target_center_id: number | null;
    created_at: string;
    // Joins
    inventory_items?: InventoryItem;
    inventory_centers?: InventoryCenter;
    target_centers?: InventoryCenter;
    akce?: { id: number; nazev: string };
    profiles?: { email: string };
};

export const getInventoryItems = async () => {
    const { data, error } = await supabase
        .from('inventory_items')
        .select('*, stocks:inventory_stock(*)')
        .eq('is_active', true)
        .order('name');

    if (error) throw error;
    return data as InventoryItem[];
};

export const getCenters = async () => {
    const { data, error } = await supabase
        .from('inventory_centers')
        .select('*')
        .order('name');

    if (error) throw error;
    return data as InventoryCenter[];
};

export const getInventoryItemById = async (id: number) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .select(`
            *,
            stocks:inventory_stock (
                *,
                centers:inventory_centers (name, color)
            )
        `)
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
// 1. Create Movement
// Movements
export const createMovement = async (movement: Partial<InventoryMovement>) => {
    // 1. Create Movement
    const { data: movementData, error } = await supabase
        .from('inventory_movements')
        .insert([movement])
        .select()
        .single();

    if (error) throw error;

    // 2. Update Stock (Specific Center)
    if (movement.inventory_item_id && movement.quantity_change && movement.center_id) {
        // Upsert Stock Record
        // First try to find existing stock
        const { data: stock } = await supabase
            .from('inventory_stock')
            .select('*')
            .eq('inventory_item_id', movement.inventory_item_id)
            .eq('center_id', movement.center_id)
            .single();

        const currentQty = stock ? stock.quantity : 0;
        const newQty = currentQty + movement.quantity_change;

        // Upsert
        const { error: stockError } = await supabase
            .from('inventory_stock')
            .upsert({
                inventory_item_id: movement.inventory_item_id,
                center_id: movement.center_id,
                quantity: newQty
            }, { onConflict: 'inventory_item_id, center_id' }); // Requires unique index

        if (stockError) throw stockError;

        // 3. Update Item Average Price (Only on Receipt)
        // We still need to update the main item's avg_price. The quantity on item is read-only (trigger), 
        // but avg_price is calculated.

        if (movement.type === 'RECEIPT' && movement.price && movement.quantity_change > 0) {
            const { data: item } = await supabase.from('inventory_items').select('quantity, avg_price').eq('id', movement.inventory_item_id).single();

            if (item) {
                // IMPORTANT: 'item.quantity' here might be the OLD quantity before trigger, OR updated. 
                // Using Formula: NewAvg = (CurrentTotalValue + IncomingValue) / NewTotalQty
                // We know incoming. We know 'item.avg_price' (current avg).
                // Careful: item.quantity contains the sum of all centers. 

                // Let's assume item.quantity is the TOTAL across all centers.
                const totalValue = (item.quantity * (item.avg_price || 0)) + (movement.quantity_change * movement.price);
                const totalQty = item.quantity + movement.quantity_change;

                await supabase.from('inventory_items').update({
                    avg_price: totalQty > 0 ? totalValue / totalQty : 0
                }).eq('id', movement.inventory_item_id);
            }
        }
    }

    return movementData;
};

export const transferStock = async (itemId: number, fromCenterId: number, toCenterId: number, quantity: number, userId?: string) => {
    // 1. Create Movement (Transfer)
    // We record one movement of type 'TRANSFER' with a negative quantity change for the source?? 
    // Usually transfers are pairs, or a single movement with from/to.
    // Our schema has 'center_id' and 'target_center_id'. 
    // Let's make it simple: One movement record representing the transfer.
    // But how to represent quantity change? It's neutral for the item globally.
    // However, for center-specific history, we might need two records??
    // Let's stick to the schema: 1 movement row. 
    // But how do we update stock? We need to update two rows in inventory_stock.

    const { data: movement, error } = await supabase
        .from('inventory_movements')
        .insert([{
            inventory_item_id: itemId,
            center_id: fromCenterId,
            target_center_id: toCenterId,
            type: 'TRANSFER',
            quantity: quantity,
            quantity_change: 0, // No global change
            user_id: userId
        }])
        .select()
        .single();

    if (error) throw error;

    // 2. Decrement Source
    const { data: sourceStock } = await supabase.from('inventory_stock').select('quantity').eq('inventory_item_id', itemId).eq('center_id', fromCenterId).single();
    await supabase.from('inventory_stock').upsert({
        inventory_item_id: itemId,
        center_id: fromCenterId,
        quantity: (sourceStock?.quantity || 0) - quantity
    }, { onConflict: 'inventory_item_id, center_id' });

    // 3. Increment Target
    const { data: targetStock } = await supabase.from('inventory_stock').select('quantity').eq('inventory_item_id', itemId).eq('center_id', toCenterId).single();
    await supabase.from('inventory_stock').upsert({
        inventory_item_id: itemId,
        center_id: toCenterId,
        quantity: (targetStock?.quantity || 0) + quantity
    }, { onConflict: 'inventory_item_id, center_id' });

    return movement;
};

export const getMovements = async (itemId?: number, limit = 50) => {
    let query = supabase
        .from('inventory_movements')
        .select(`
            *,
            inventory_items (name, unit),
            akce (nazev)
            *,
            inventory_items (name, unit),
            akce (nazev),
            inventory_centers (name),
            target_centers:inventory_centers!target_center_id (name)
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
