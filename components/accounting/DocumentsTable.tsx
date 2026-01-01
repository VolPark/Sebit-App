'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AccountingDocument } from '@/types/accounting';
import { format } from 'date-fns';
import { DocumentDetailModal } from './DocumentDetailModal';

interface DocumentsTableProps {
    type: 'sales_invoice' | 'purchase_invoice';
}

export function DocumentsTable({ type }: DocumentsTableProps) {
    const [documents, setDocuments] = useState<AccountingDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState<AccountingDocument | null>(null);

    useEffect(() => {
        fetchDocuments();
    }, [type]);

    const fetchDocuments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('accounting_documents')
            .select('*')
            .eq('type', type)
            .order('issue_date', { ascending: false });

        if (error) {
            console.error('Error fetching documents', error);
        } else {
            setDocuments(data || []);
        }
        setLoading(false);
    };

    const formatCurrency = (amount: number, currency = 'CZK') => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(amount);
    };

    if (loading) return <div className="p-4 text-center">Načítám...</div>;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-b dark:border-slate-700">
                    <tr>
                        <th className="px-6 py-4 whitespace-nowrap">Číslo</th>
                        <th className="px-6 py-4 whitespace-nowrap">{type === 'sales_invoice' ? 'Odběratel' : 'Dodavatel'}</th>
                        <th className="px-6 py-4 whitespace-nowrap">Datum vystavení</th>
                        <th className="px-6 py-4 whitespace-nowrap">Datum splatnosti</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">Částka</th>
                        <th className="px-6 py-4 whitespace-nowrap">Stav</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">Akce</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 font-medium">{doc.number}</td>
                            <td className="px-6 py-4">{doc.supplier_name || '-'}</td>
                            <td className="px-6 py-4">{doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('cs-CZ') : '-'}</td>
                            <td className="px-6 py-4">{doc.due_date ? new Date(doc.due_date).toLocaleDateString('cs-CZ') : '-'}</td>
                            <td className="px-6 py-4 text-right font-bold">
                                {formatCurrency(doc.amount, doc.currency)}
                            </td>
                            <td className="px-6 py-4">
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                    {doc.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button
                                    onClick={() => setSelectedDoc(doc)}
                                    className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    Detail
                                </button>
                            </td>
                        </tr>
                    ))}
                    {documents.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                Žádné faktury k zobrazení.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {selectedDoc && (
                <DocumentDetailModal
                    open={!!selectedDoc}
                    onOpenChange={(open) => !open && setSelectedDoc(null)}
                    document={selectedDoc}
                />
            )}
        </div>
    );
}
