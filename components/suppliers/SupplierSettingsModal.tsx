'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Save, Server, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/errors';
interface SupplierSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier?: any; // If editing existing
    onSave?: () => void;
}

export function SupplierSettingsModal({ open, onOpenChange, supplier, onSave }: SupplierSettingsModalProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState(supplier?.name || '');
    const [type, setType] = useState(supplier?.type || 'sftp_demos');

    // Config fields
    const [host, setHost] = useState(supplier?.config?.host || '');
    const [username, setUsername] = useState(supplier?.config?.username || '');
    const [password, setPassword] = useState(supplier?.config?.password || '');
    const [showPassword, setShowPassword] = useState(false);
    const [path, setPath] = useState(supplier?.config?.path || '/');

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                name,
                type,
                config: {
                    host,
                    username,
                    password,
                    path
                },
                is_active: true
            };

            let error;
            if (supplier?.id) {
                const res = await supabase.from('suppliers').update(payload).eq('id', supplier.id);
                error = res.error;
            } else {
                const res = await supabase.from('suppliers').insert([payload]);
                error = res.error;
            }

            if (error) throw error;

            toast.success('Dodavatel uložen');

            // AML Check Trigger
            try {
                const amlRes = await fetch('/api/aml/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, ico: '' }) // ICO not in form yet
                });

                if (amlRes.ok) {
                    const amlData = await amlRes.json();
                    if (amlData.status === 'hits_found') {
                        toast.warning('POZOR: Nalezena shoda v sankčním seznamu! (AML)', { duration: 5000 });
                    } else if (amlData.riskRating === 'high' || amlData.riskRating === 'critical') {
                        toast.warning(`POZOR: Subjekt vyhodnocen jako ${amlData.riskRating.toUpperCase()} RISK!`, { duration: 5000 });
                    } else {
                        toast.info('AML Check: OK (Clean)', { duration: 2000 });
                    }
                }
            } catch (amlError) {
                console.error('AML Check trigger failed', amlError);
                // Don't block user flow
            }

            onOpenChange(false);
            if (onSave) onSave();

        } catch (e: unknown) {
            console.error(e);
            toast.error('Chyba při ukládání: ' + getErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Server className="w-5 h-5 text-blue-600" />
                        {supplier ? 'Upravit dodavatele' : 'Nový dodavatel'}
                    </h2>
                    <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Název</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                            placeholder="Např. Demos Trade"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Typ integrace</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                        >
                            <option value="sftp_demos">SFTP (Demos Trade šablona)</option>
                            <option value="sftp_xml">SFTP (XML)</option>
                            <option value="sftp_csv">SFTP (CSV)</option>
                        </select>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Nastavení připojení (SFTP)</h3>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Host (Adresa)</label>
                                <input
                                    type="text"
                                    value={host}
                                    onChange={(e) => setHost(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    placeholder="sftp.example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Uživatel</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    placeholder="username"
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Heslo</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700 pr-10"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Cesta k souboru (Složka)</label>
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                placeholder="/public/cenniky/"
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Ukládám...' : <><Save className="w-4 h-4" /> Uložit</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
