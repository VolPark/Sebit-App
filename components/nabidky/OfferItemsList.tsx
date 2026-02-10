'use client';

import { useState } from 'react';
import { NabidkaPolozka } from '@/lib/types/nabidky-types';
import { deleteOfferItem, reorderOfferItems } from '@/lib/api/nabidky-api';
import EditOfferItemModal from './EditOfferItemModal';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface OfferItemsListProps {
    items: NabidkaPolozka[];
    nabidkaId: number;
    onRefresh: () => void;
    onItemsReorder?: (reorderedItems: NabidkaPolozka[]) => void;
}

function SortableRow({
    item,
    currency,
    onEdit,
    onDelete,
}: {
    item: NabidkaPolozka;
    currency: Intl.NumberFormat;
    onEdit: (item: NabidkaPolozka) => void;
    onDelete: (id: number) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 50 : undefined,
    };

    const isDiscount = item.je_sleva || item.cena_ks < 0;

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={`transition-colors ${
                isDiscount
                    ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
            }`}
        >
            <td className="px-2 py-3 w-10">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-none"
                    title="Přetáhnout pro změnu pořadí"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.5" />
                        <circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" />
                        <circle cx="15" cy="18" r="1.5" />
                    </svg>
                </button>
            </td>
            <td className="px-4 py-3">
                <div className={`font-medium ${isDiscount ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {isDiscount && '↓ '}{item.nazev}
                </div>
                {item.popis && <div className="text-xs text-gray-500 truncate max-w-[200px]">{item.popis}</div>}
            </td>
            <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-400">{item.typ}</td>
            <td className="px-4 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">{item.mnozstvi}</td>
            <td className={`px-4 py-3 text-right tabular-nums ${isDiscount ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {currency.format(item.cena_ks)}
            </td>
            <td className={`px-4 py-3 text-right tabular-nums font-bold ${isDiscount ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {currency.format(item.celkem)}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => onEdit(item)}
                        className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded-lg transition-colors"
                        title="Upravit"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button
                        onClick={() => onDelete(item.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                        title="Smazat"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function OfferItemsList({ items, nabidkaId, onRefresh, onItemsReorder }: OfferItemsListProps) {
    const [editingItem, setEditingItem] = useState<NabidkaPolozka | null>(null);
    const [localItems, setLocalItems] = useState<NabidkaPolozka[] | null>(null);

    const displayItems = localItems ?? items;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDelete = async (id: number) => {
        if (!confirm('Opravdu smazat položku?')) return;
        try {
            await deleteOfferItem(id, nabidkaId);
            onRefresh();
        } catch (error) {
            console.error(error);
            alert('Chyba při mazání položky.');
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = displayItems.findIndex(i => i.id === active.id);
        const newIndex = displayItems.findIndex(i => i.id === over.id);

        const newItems = arrayMove(displayItems, oldIndex, newIndex);
        setLocalItems(newItems);

        const updates = newItems.map((item, index) => ({
            id: item.id,
            poradi: index + 1,
        }));

        try {
            await reorderOfferItems(updates);
            // Propagate new order to parent (for PDF etc.) without full refresh
            onItemsReorder?.(newItems);
        } catch (error) {
            console.error('Reorder failed', error);
            setLocalItems(null);
        }
    };

    // Sync local items when props change
    if (localItems && items.length !== localItems.length) {
        setLocalItems(null);
    }

    const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

    if (items.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-900/50">
                Žádné položky k zobrazení. Přidejte první položku.
            </div>
        );
    }

    return (
        <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white font-semibold">
                            <tr>
                                <th className="px-2 py-3 w-10"></th>
                                <th className="px-4 py-3">Název</th>
                                <th className="px-4 py-3 w-32">Typ</th>
                                <th className="px-4 py-3 text-right w-24">Mn.</th>
                                <th className="px-4 py-3 text-right w-32">Cena/ks</th>
                                <th className="px-4 py-3 text-right w-32">Celkem</th>
                                <th className="px-4 py-3 w-24 text-right">Akce</th>
                            </tr>
                        </thead>
                        <SortableContext items={displayItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {displayItems.map((item) => (
                                    <SortableRow
                                        key={item.id}
                                        item={item}
                                        currency={currency}
                                        onEdit={setEditingItem}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </tbody>
                        </SortableContext>
                    </table>
                </div>
            </DndContext>

            {editingItem && (
                <EditOfferItemModal
                    item={editingItem}
                    onClose={() => setEditingItem(null)}
                    onSaved={onRefresh}
                />
            )}
        </>
    );
}
