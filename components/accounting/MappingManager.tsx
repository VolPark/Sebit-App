'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AccountingDocument } from '@/types/accounting';

interface MappingManagerProps {
    document: AccountingDocument;
}

interface Mapping {
    id?: number;
    akce_id: number | null;
    pracovnik_id: number | null;
    division_id: number | null;
    cost_category: string;
    amount: number;
    note: string;
}

export function MappingManager({ document }: MappingManagerProps) {
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [projects, setProjects] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);

    const [newMapping, setNewMapping] = useState<Mapping>({
        akce_id: null,
        pracovnik_id: null,
        division_id: null,
        cost_category: document.type === 'sales_invoice' ? 'service' : 'material',
        amount: 0,
        note: ''
    });

    useEffect(() => {
        fetchData();
    }, [document.id]);

    const fetchData = async () => {
        setLoading(true);
        const [mRes, akceRes, workRes, divRes] = await Promise.all([
            supabase.from('accounting_mappings').select('*').eq('document_id', document.id),
            supabase.from('akce').select('id, nazev').order('created_at', { ascending: false }).limit(200),
            supabase.from('pracovnici').select('id, jmeno'),
            supabase.from('divisions').select('id, nazev')
        ]);

        if (mRes.data) setMappings(mRes.data);
        if (akceRes.data) setProjects(akceRes.data);
        if (workRes.data) setWorkers(workRes.data);
        if (divRes.data) setDivisions(divRes.data);

        // Auto-fill remaining
        const currentTotal = (mRes.data || []).reduce((acc: number, m: any) => acc + Number(m.amount), 0);
        const remaining = document.amount - currentTotal;
        if (remaining > 0) {
            setNewMapping(prev => ({ ...prev, amount: Number(remaining.toFixed(2)) }));
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (newMapping.amount <= 0) {
            alert('Částka musí být kladná');
            return;
        }

        const payload = {
            document_id: document.id,
            akce_id: newMapping.akce_id,
            pracovnik_id: newMapping.pracovnik_id,
            division_id: newMapping.division_id,
            cost_category: newMapping.cost_category,
            amount: newMapping.amount,
            note: newMapping.note
        };

        if (editingId) {
            // Update
            const { error } = await supabase.from('accounting_mappings').update(payload).eq('id', editingId);
            if (error) {
                alert('Chyba při úpravě: ' + error.message);
            } else {
                setMappings(mappings.map(m => m.id === editingId ? { ...m, ...payload, id: editingId } : m));
                resetForm();
            }
        } else {
            // Insert
            const { data, error } = await supabase.from('accounting_mappings').insert(payload).select().single();
            if (error) {
                alert('Chyba při ukládání: ' + error.message);
            } else {
                setMappings([...mappings, data as Mapping]);
                resetForm(mappings, (data as Mapping).amount);
            }
        }
    };

    const resetForm = (currentMappings = mappings, addedAmount = 0) => {
        const currentTotal = currentMappings.reduce((acc, m) => acc + Number(m.amount), 0) + addedAmount;
        const remaining = Math.max(0, document.amount - currentTotal);

        setEditingId(null);
        setNewMapping({
            akce_id: null,
            pracovnik_id: null,
            division_id: null,
            cost_category: document.type === 'sales_invoice' ? 'service' : 'material',
            amount: Number(remaining.toFixed(2)),
            note: ''
        });
    };

    const handleEdit = (mapping: Mapping) => {
        setEditingId(mapping.id!);
        setNewMapping({ ...mapping });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Opravdu smazat?')) return;
        const { error } = await supabase.from('accounting_mappings').delete().eq('id', id);
        if (error) {
            alert('Chyba mazání');
        } else {
            setMappings(mappings.filter(m => m.id !== id));
        }
    };

    const totalMapped = mappings.reduce((acc, m) => acc + Number(m.amount), 0);
    const remaining = document.amount - totalMapped;

    if (loading) return <div className="p-4">Načítám...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
            {/* Summary Header */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 border-b dark:border-slate-800 shadow-sm">
                <span className="font-semibold text-lg">Celkem: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: document.currency }).format(document.amount)}</span>
                <span className={`text-lg font-mono px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 ${remaining !== 0 ? "text-orange-600 font-bold" : "text-green-600 font-bold"}`}>
                    Zbývá: {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: document.currency }).format(remaining)}
                </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
                {mappings.map(m => (
                    <div key={m.id} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-2">
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-1 text-sm">
                            <div className="md:col-span-1">
                                <span className="block text-xs text-slate-500">Projekt</span>
                                <span className="font-medium truncate block" title={projects.find(p => p.id === m.akce_id)?.nazev}>{projects.find(p => p.id === m.akce_id)?.nazev || '-'}</span>
                            </div>
                            <div className="md:col-span-1">
                                <span className="block text-xs text-slate-500">Pracovník</span>
                                <span className="truncate block" title={workers.find(w => w.id === m.pracovnik_id)?.jmeno}>{workers.find(w => w.id === m.pracovnik_id)?.jmeno || '-'}</span>
                            </div>
                            <div className="md:col-span-1">
                                <span className="block text-xs text-slate-500">Divize</span>
                                {/* @ts-ignore */}
                                <span className="truncate block">{divisions.find(d => d.id === m.division_id)?.nazev || '-'}</span>
                            </div>
                            <div className="md:col-span-1">
                                <span className="block text-xs text-slate-500">Kategorie</span>
                                <span className="truncate block">
                                    {m.cost_category === 'material' ? 'Materiál' :
                                        m.cost_category === 'service' ? 'Služba' :
                                            m.cost_category === 'overhead' ? 'Režie' : m.cost_category}
                                </span>
                            </div>
                            <div className="md:col-span-1">
                                <span className="block text-xs text-slate-500">Poznámka</span>
                                <span className="truncate block" title={m.note}>{m.note || '-'}</span>
                            </div>
                            <div className="text-right md:col-span-1">
                                <span className="block text-xs text-slate-500">Částka</span>
                                <span className="font-bold">{new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: document.currency }).format(m.amount)}</span>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(m.id!)} className="self-end md:self-center ml-4 p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors">
                            🗑️
                        </button>
                    </div>
                ))}
                {mappings.length === 0 && <div className="text-center text-slate-500 py-8 italic">Žádná přiřazení.</div>}
            </div>

            {/* Add/Edit Form */}
            <div className={`bg-white dark:bg-slate-900 p-4 border-t dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 ${editingId ? 'ring-2 ring-blue-500 ring-inset' : ''}`}>
                <h3 className={`font-bold mb-3 text-xs uppercase tracking-wider ${editingId ? 'text-blue-600' : 'text-slate-500'}`}>
                    {editingId ? 'Úprava přiřazení' : 'Nové přiřazení'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">

                    {/* Project Select */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Projekt</label>
                        <select
                            value={newMapping.akce_id || ''}
                            onChange={e => setNewMapping(p => ({ ...p, akce_id: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm"
                        >
                            <option value="">-- Žádný --</option>
                            {projects.map(o => <option key={o.id} value={o.id}>{o.nazev}</option>)}
                        </select>
                    </div>

                    {/* Worker Select */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Pracovník</label>
                        <select
                            value={newMapping.pracovnik_id || ''}
                            onChange={e => setNewMapping(p => ({ ...p, pracovnik_id: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm"
                        >
                            <option value="">-- Žádný --</option>
                            {workers.map(o => <option key={o.id} value={o.id}>{o.jmeno}</option>)}
                        </select>
                    </div>

                    {/* Division Select */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Divize</label>
                        <select
                            value={newMapping.division_id || ''}
                            onChange={e => setNewMapping(p => ({ ...p, division_id: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm"
                        >
                            <option value="">-- Žádný --</option>
                            {divisions.map(o => <option key={o.id} value={o.id}>{o.nazev}</option>)}
                        </select>
                    </div>

                    {/* Category Select */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Kategorie</label>
                        <select
                            value={newMapping.cost_category}
                            onChange={e => setNewMapping(p => ({ ...p, cost_category: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm"
                        >
                            <option value="material">Materiál</option>
                            <option value="service">Služba</option>
                            <option value="overhead">Režie</option>
                        </select>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Částka</label>
                        <input
                            type="number"
                            value={newMapping.amount}
                            onChange={e => setNewMapping(p => ({ ...p, amount: Number(e.target.value) }))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm"
                        />
                    </div>

                    {/* Note Input */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Poznámka</label>
                        <input
                            type="text"
                            value={newMapping.note}
                            onChange={e => setNewMapping(p => ({ ...p, note: e.target.value }))}
                            placeholder="..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-sm"
                        />
                    </div>

                </div>

                <div className="flex gap-3 mt-4">
                    {editingId && (
                        <button
                            onClick={() => resetForm()}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg transition-colors"
                        >
                            Zrušit úpravu
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        className={`flex-1 font-bold py-2 rounded-lg transition-colors text-white ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                        {editingId ? 'Uložit změny' : '+ Přidat přiřazení'}
                    </button>
                </div>
            </div>
        </div>
    );
}
