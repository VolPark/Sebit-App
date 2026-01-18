'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AccountingDocument } from '@/types/accounting';
import { Edit2, Trash2, Save, X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MappingManagerProps {
    document: AccountingDocument;
    overrideTotalAmount?: number;
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

export function MappingManager({ document, overrideTotalAmount }: MappingManagerProps) {
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [projects, setProjects] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [divisions, setDivisions] = useState<any[]>([]);

    const materialLabel = process.env.NEXT_PUBLIC_MATERIAL_LABEL === 'HIDDEN' ? 'Materiál' : (process.env.NEXT_PUBLIC_MATERIAL_LABEL || 'Materiál');
    const showMaterial = process.env.NEXT_PUBLIC_MATERIAL_LABEL !== 'HIDDEN';

    // Use the override amount if provided, otherwise fallback to document amount
    // Ideally document.amount should be number, but sometimes it might be string from API?
    // Types say number.
    const effectiveTotalAmount = overrideTotalAmount !== undefined ? overrideTotalAmount : document.amount;

    const [newMapping, setNewMapping] = useState<Mapping>({
        akce_id: null,
        pracovnik_id: null,
        division_id: null,
        cost_category: document.type === 'sales_invoice' ? 'service' : (showMaterial ? 'material' : 'service'),
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
        const remaining = effectiveTotalAmount - currentTotal;
        if (Math.abs(remaining) > 0.001) {
            setNewMapping(prev => ({ ...prev, amount: Number(remaining.toFixed(2)) }));
        }
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (newMapping.amount === 0) {
            alert('Částka nesmí být nulová');
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
                const updatedMappings = mappings.map(m => m.id === editingId ? { ...m, ...payload, id: editingId } : m);
                setMappings(updatedMappings);
                resetForm(updatedMappings);
            }
        } else {
            // Insert
            const { data, error } = await supabase.from('accounting_mappings').insert(payload).select().single();
            if (error) {
                alert('Chyba při ukládání: ' + error.message);
            } else {
                const newMappings = [...mappings, data as Mapping];
                setMappings(newMappings);
                resetForm(newMappings);
            }
        }
    };

    const resetForm = (currentMappings: Mapping[]) => {
        const currentTotal = currentMappings.reduce((acc, m) => acc + Number(m.amount), 0);
        const remaining = effectiveTotalAmount - currentTotal;

        setEditingId(null);
        setNewMapping({
            akce_id: null,
            pracovnik_id: null,
            division_id: null,
            cost_category: document.type === 'sales_invoice' ? 'service' : (showMaterial ? 'material' : 'service'),
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
            const newMappings = mappings.filter(m => m.id !== id);
            setMappings(newMappings);
            // Recalculate remaining for the form
            const currentTotal = newMappings.reduce((acc, m) => acc + Number(m.amount), 0);
            const remaining = effectiveTotalAmount - currentTotal;
            setNewMapping(prev => ({ ...prev, amount: Number(remaining.toFixed(2)) }));
        }
    };

    const totalMapped = mappings.reduce((acc, m) => acc + Number(m.amount), 0);
    const remaining = effectiveTotalAmount - totalMapped;
    const isFullyMapped = Math.abs(remaining) < 0.01;

    if (loading) return <div className="p-8 text-center text-slate-500">Načítám data...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50">
            {/* Summary Header */}
            <div className="bg-white dark:bg-slate-900 p-4 border-b dark:border-slate-800 shadow-sm flex flex-wrap gap-4 justify-between items-center sticky top-0 z-10">
                <div>
                    <span className="text-slate-500 text-sm uppercase tracking-wider font-semibold">Celková částka</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: document.currency }).format(effectiveTotalAmount)}
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${isFullyMapped
                    ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                    : "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400"}`}>
                    {isFullyMapped ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <div className="flex flex-col text-right">
                        <span className="text-xs font-bold uppercase opacity-80">Zbývá přiřadit</span>
                        <span className="text-lg font-mono font-bold">
                            {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: document.currency }).format(remaining)}
                        </span>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {mappings.map(m => {
                    const project = projects.find(p => p.id === m.akce_id);
                    const worker = workers.find(w => w.id === m.pracovnik_id);
                    const division = divisions.find(d => d.id === m.division_id);

                    return (
                        <div key={m.id} className={`group bg-white dark:bg-slate-900 p-4 rounded-xl border transition-all shadow-sm hover:shadow-md ${editingId === m.id
                            ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/10'
                            : 'border-slate-200 dark:border-slate-800'
                            }`}>
                            <div className="flex flex-col gap-3">
                                {/* Top Row: Main Info */}
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">

                                        {/* Project */}
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Projekt</span>
                                            <div className="font-medium text-slate-900 dark:text-slate-100 truncate" title={project?.nazev}>
                                                {project?.nazev || <span className="text-slate-400 italic">-- Neuvedeno --</span>}
                                            </div>
                                        </div>

                                        {/* Worker */}
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pracovník</span>
                                            <div className="text-slate-700 dark:text-slate-300 truncate" title={worker?.jmeno}>
                                                {worker?.jmeno || <span className="text-slate-400 italic">-- Neuvedeno --</span>}
                                            </div>
                                        </div>

                                        {/* Division */}
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Divize</span>
                                            <div className="text-slate-700 dark:text-slate-300 truncate">
                                                {/* @ts-ignore */}
                                                {division?.nazev || <span className="text-slate-400 italic">-- Neuvedeno --</span>}
                                            </div>
                                        </div>

                                        {/* Category */}
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kategorie</span>
                                            <div className="text-slate-700 dark:text-slate-300">
                                                {m.cost_category === 'material' ? <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>{materialLabel}</span> :
                                                    m.cost_category === 'service' ? <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>Služba</span> :
                                                        m.cost_category === 'overhead' ? <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500"></span>Režie</span> :
                                                            m.cost_category}
                                            </div>
                                        </div>

                                        {/* Note */}
                                        <div className="min-w-0 sm:col-span-2 lg:col-span-2">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Poznámka</span>
                                            <div className="text-slate-600 dark:text-slate-400 text-sm truncate" title={m.note}>
                                                {m.note || '-'}
                                            </div>
                                        </div>

                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1 pl-2 border-l border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={() => handleEdit(m)}
                                            className={`p-2 rounded-lg transition-colors ${editingId === m.id ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                            title="Upravit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(m.id!)}
                                            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Smazat"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Amount Highlight */}
                                <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800">
                                    <div className="text-right">

                                        <span className="text-base font-bold text-slate-900 dark:text-white">
                                            {new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: document.currency }).format(m.amount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {mappings.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-full mb-3">
                            <Plus className="w-6 h-6" />
                        </div>
                        <p>Zatím žádná přiřazení.</p>
                        <p className="text-sm opacity-70">Přidejte nové pomocí formuláře níže.</p>
                    </div>
                )}
            </div>

            {/* Add/Edit Form */}
            <div className={`bg-white dark:bg-slate-900 p-5 border-t dark:border-slate-800 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-20 ${editingId ? 'ring-2 ring-blue-500 ring-inset' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-bold text-sm uppercase tracking-wider flex items-center gap-2 ${editingId ? 'text-blue-600' : 'text-slate-700 dark:text-slate-300'}`}>
                        {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingId ? 'Úprava existujícího přiřazení' : 'Nové přiřazení'}
                    </h3>
                    {editingId && (
                        <button
                            onClick={() => resetForm(mappings)} // Pass mappings here
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-3 h-3" /> Zrušit
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-4">

                    {/* Project Select */}
                    <div className="lg:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Projekt</label>
                        <select
                            value={newMapping.akce_id || ''}
                            onChange={e => setNewMapping(p => ({ ...p, akce_id: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="">-- Žádný --</option>
                            {projects.map(o => <option key={o.id} value={o.id}>{o.nazev}</option>)}
                        </select>
                    </div>

                    {/* Worker Select */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Pracovník</label>
                        <select
                            value={newMapping.pracovnik_id || ''}
                            onChange={e => setNewMapping(p => ({ ...p, pracovnik_id: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="">-- Žádný --</option>
                            {workers.map(o => <option key={o.id} value={o.id}>{o.jmeno}</option>)}
                        </select>
                    </div>

                    {/* Division Select */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Divize</label>
                        <select
                            value={newMapping.division_id || ''}
                            onChange={e => setNewMapping(p => ({ ...p, division_id: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                            <option value="">-- Žádný --</option>
                            {divisions.map(o => <option key={o.id} value={o.id}>{o.nazev}</option>)}
                        </select>
                    </div>

                    {/* Category */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Kategorie</label>
                        <select
                            value={newMapping.cost_category}
                            onChange={e => setNewMapping(p => ({ ...p, cost_category: e.target.value }))}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        >
                            {showMaterial && <option value="material">{materialLabel}</option>}
                            <option value="service">Služba</option>
                            <option value="overhead">Režie</option>
                        </select>
                    </div>

                    {/* Note */}
                    <div className="lg:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">Poznámka</label>
                        <input
                            type="text"
                            value={newMapping.note}
                            onChange={e => setNewMapping(p => ({ ...p, note: e.target.value }))}
                            placeholder="..."
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Amount & Button Row */}
                    <div className="lg:col-span-12 flex items-end gap-3 mt-2">
                        <div className="w-1/3 md:w-1/4 lg:w-1/6">
                            <label className="block text-xs font-bold text-slate-500 mb-1.5">Částka</label>
                            <input
                                type="number"
                                value={newMapping.amount}
                                onChange={e => setNewMapping(p => ({ ...p, amount: Number(e.target.value) }))}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 font-mono font-bold text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            className={`flex-1 h-[38px] flex items-center justify-center gap-2 font-bold px-6 rounded-lg transition-all shadow-sm hover:shadow active:scale-[0.98] ${editingId
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                                }`}
                        >
                            {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editingId ? 'Uložit změny' : 'Přidat'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
