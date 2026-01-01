'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ProviderSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProviderSettingsModal({ open, onOpenChange }: ProviderSettingsModalProps) {
    const [customerId, setCustomerId] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        if (open) {
            loadSettings();
        }
    }, [open]);

    const loadSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('accounting_providers')
            .select('*')
            .eq('code', 'uol')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error loading settings', error);
            toast.error('Chyba načítání nastavení');
        } else if (data) {
            const config = data.config || {};
            setIsActive(data.is_enabled);
            setEmail(config.email || '');
            setPassword(config.apiKey || ''); // Start storing password in apiKey field

            // Extract customerId from baseUrl
            // baseUrl: https://{customerId}.ucetnictvi.uol.cz/api
            if (config.baseUrl) {
                const match = config.baseUrl.match(/https:\/\/(.+?)\.ucetnictvi\.uol\.cz\/api/);
                if (match && match[1]) {
                    setCustomerId(match[1]);
                }
            }
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const newConfig = {
            baseUrl: `https://${customerId}.ucetnictvi.uol.cz/api`,
            email: email,
            apiKey: password
        };

        // Check if exists
        const { data: existing } = await supabase
            .from('accounting_providers')
            .select('id')
            .eq('code', 'uol')
            .single();

        let error;
        if (existing) {
            const { error: err } = await supabase
                .from('accounting_providers')
                .update({
                    name: 'UOL Účetnictví',
                    is_enabled: isActive,
                    config: newConfig
                })
                .eq('id', existing.id);
            error = err;
        } else {
            const { error: err } = await supabase
                .from('accounting_providers')
                .insert({
                    code: 'uol',
                    name: 'UOL Účetnictví',
                    is_enabled: isActive,
                    config: newConfig
                });
            error = err;
        }

        if (error) {
            toast.error('Chyba ukládání: ' + error.message);
        } else {
            toast.success('Nastavení uloženo');
            onOpenChange(false);
        }
        setLoading(false);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <h2 className="text-lg font-bold">Nastavení připojení UOL</h2>
                    <button onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-4">

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="active"
                            checked={isActive}
                            onChange={e => setIsActive(e.target.checked)}
                            className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                        />
                        <label htmlFor="active" className="text-sm font-medium text-gray-700 dark:text-gray-300">Aktivní integrace</label>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Zákaznické ID (customerId)</label>
                        <input
                            type="text"
                            value={customerId}
                            onChange={e => setCustomerId(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                            placeholder="např. sebitsolutio"
                            required
                        />
                        <p className="text-xs text-gray-500">Část URL: https://{'<customerId>'}.ucetnictvi.uol.cz/api</p>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email (Uživatelské jméno)</label>
                        <input
                            type="text" // email often triggers autocomplete that might be annoying here if used for login elsewhere, but standard is type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                            placeholder="vas@email.cz"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Heslo / API Klíč</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                            required
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? 'Ukládám...' : 'Uložit nastavení'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
