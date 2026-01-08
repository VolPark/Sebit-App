'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AccountingDocument } from '@/types/accounting';
import { DocumentDetailModal } from '@/components/accounting/DocumentDetailModal';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PdfDownloadButton } from '@/components/accounting/reports/PdfDownloadButton';
import { PayablesPdf } from '@/components/accounting/reports/PayablesPdf';

interface GroupedPayables {
    supplier_name: string;
    documents: AccountingDocument[];
    total_amount: number;
    total_paid: number;
    total_remaining: number;
}

export function PayablesReport() {
    const [groupedData, setGroupedData] = useState<GroupedPayables[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState<AccountingDocument | null>(null);
    const [summary, setSummary] = useState({
        totalAmount: 0,
        totalRemaining: 0,
        count: 0
    });

    const fetchPayables = async () => {
        setLoading(true);
        try {
            // Fetch purchase invoices with positive amount
            const { data: docsData, error } = await supabase
                .from('accounting_documents')
                .select('*')
                .eq('type', 'purchase_invoice')
                .gt('amount', 0)
                .order('supplier_name', { ascending: true })
                .order('issue_date', { ascending: false });

            if (error) throw error;

            const docs = docsData || [];

            // Filter strictly for unpaid > 1 CZK tolerance
            const unpaidDocs = docs.filter(d => (d.amount - (d.paid_amount || 0)) > 1);

            // Fetch mappings for these documents
            if (unpaidDocs.length > 0) {
                const docIds = unpaidDocs.map(d => d.id);
                const { data: mappingsData } = await supabase
                    .from('accounting_mappings')
                    .select('*')
                    .in('document_id', docIds);

                if (mappingsData) {
                    unpaidDocs.forEach(d => {
                        d.accounting_mappings = mappingsData.filter((m: any) => m.document_id === d.id);
                    });
                }
            }

            // Group by supplier
            const groups: { [key: string]: GroupedPayables } = {};
            let totalAmount = 0;
            let totalRemaining = 0;

            unpaidDocs.forEach(doc => {
                const name = doc.supplier_name || 'Neznámý dodavatel';
                if (!groups[name]) {
                    groups[name] = {
                        supplier_name: name,
                        documents: [],
                        total_amount: 0,
                        total_paid: 0,
                        total_remaining: 0
                    };
                }
                const remaining = doc.amount - (doc.paid_amount || 0);
                groups[name].documents.push(doc);
                groups[name].total_amount += doc.amount;
                groups[name].total_paid += (doc.paid_amount || 0);
                groups[name].total_remaining += remaining;

                totalAmount += doc.amount;
                totalRemaining += remaining;
            });

            setGroupedData(Object.values(groups));
            setSummary({
                totalAmount,
                totalRemaining,
                count: unpaidDocs.length
            });

        } catch (e) {
            console.error('Error fetching payables:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayables();
    }, []);

    const formatMoney = (val: number, currency = 'CZK') => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(val);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('cs-CZ');
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Načítám data...</div>;

    return (
        <div className="space-y-6">
            {/* Header / Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/accounting?tab=reports" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Závazky</h1>
                        </div>
                        <div className="text-sm text-slate-500 space-y-1 ml-1">
                            <p>Ke dni: <span className="font-medium">{new Date().toLocaleDateString('cs-CZ')}</span></p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-4">
                        {groupedData.length > 0 && (
                            <PdfDownloadButton
                                document={<PayablesPdf data={groupedData} />}
                                fileName={`Zavazky_${new Date().toLocaleDateString('cs-CZ')}.pdf`}
                                label="Vytisknout PDF"
                            />
                        )}
                        <div className="text-right space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between gap-8 text-sm text-slate-500">
                                <span>Počet věřitelů:</span>
                                <span className="font-medium text-slate-900 dark:text-white">{groupedData.length}</span>
                            </div>
                            <div className="flex justify-between gap-8 text-sm text-slate-500">
                                <span>Počet faktur:</span>
                                <span className="font-medium text-slate-900 dark:text-white">{summary.count}</span>
                            </div>
                            <div className="flex justify-between gap-8 text-sm pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span>Celkem k úhradě:</span>
                                <span className="font-bold text-lg text-slate-900 dark:text-white">{formatMoney(summary.totalRemaining)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 border-b border-slate-200 dark:border-slate-700 pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                    <div className="col-span-2">Doklad</div>
                    <div className="col-span-1">Typ</div>
                    <div className="col-span-1">VS</div>
                    <div className="col-span-1">Platba</div>
                    <div className="col-span-1">DUZP</div>
                    <div className="col-span-1">Splatnost</div>
                    <div className="col-span-2 text-right">Celkem</div>
                    <div className="col-span-1 text-right">Uhrazeno</div>
                    <div className="col-span-2 text-right">Zůstatek</div>
                </div>
            </div>

            {/* List of Groups */}
            <div className="space-y-6">
                {groupedData.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500">
                        Žádné závazky k zobrazení.
                    </div>
                ) : (
                    groupedData.map((group, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                            {/* Group Header */}
                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {group.supplier_name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{group.supplier_name}</h3>
                                        {group.documents[0]?.supplier_ico && <span className="text-xs text-slate-500 font-mono">IČO: {group.documents[0].supplier_ico}</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-slate-500 uppercase tracking-wider mr-2">Celkem k úhradě</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{formatMoney(group.total_remaining)}</span>
                                </div>
                            </div>

                            {/* Documents List */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {group.documents.map(doc => {
                                    const rd = doc.raw_data as any || {};
                                    const remaining = doc.amount - (doc.paid_amount || 0);

                                    return (
                                        <div
                                            key={doc.id}
                                            onClick={() => setSelectedDoc(doc)}
                                            className="grid grid-cols-2 md:grid-cols-12 gap-y-2 md:gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-sm group"
                                        >
                                            <div className="md:col-span-2 font-medium text-rose-600 dark:text-rose-400 group-hover:underline decoration-1 underline-offset-2 flex items-center gap-2">
                                                {doc.number}
                                            </div>

                                            <div className="md:col-span-1 text-slate-500 text-xs md:text-sm"><span className="md:hidden font-semibold">Typ: </span>Faktura</div>
                                            <div className="md:col-span-1 font-mono text-slate-600 dark:text-slate-400 text-xs md:text-sm"><span className="md:hidden font-semibold">VS: </span>{rd.variable_symbol || '-'}</div>
                                            <div className="md:col-span-1 text-slate-600 dark:text-slate-400 truncate text-xs md:text-sm"><span className="md:hidden font-semibold">Platba: </span>{rd.payment_method || 'Převodem'}</div>
                                            <div className="md:col-span-1 text-slate-600 dark:text-slate-400 text-xs md:text-sm"><span className="md:hidden font-semibold">DUZP: </span>{formatDate(doc.tax_date || doc.issue_date)}</div>
                                            <div className="md:col-span-1 text-slate-600 dark:text-slate-400 font-medium text-xs md:text-sm"><span className="md:hidden font-semibold">Splatnost: </span>{formatDate(doc.due_date)}</div>

                                            <div className="md:col-span-2 text-right font-medium text-slate-900 dark:text-slate-200"><span className="md:hidden font-semibold mr-2">Celkem:</span>{formatMoney(doc.amount, doc.currency)}</div>
                                            <div className="md:col-span-1 text-right text-slate-500"><span className="md:hidden font-semibold mr-2">Uhrazeno:</span>{formatMoney(doc.paid_amount || 0, doc.currency)}</div>
                                            <div className="md:col-span-2 text-right font-bold text-slate-900 dark:text-white"><span className="md:hidden font-semibold mr-2">Zůstatek:</span>{formatMoney(remaining, doc.currency)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

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
