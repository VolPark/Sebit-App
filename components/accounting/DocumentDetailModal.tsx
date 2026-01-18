'use client';

import { AccountingDocument } from '@/types/accounting';
import { useState } from 'react';
import { MappingManager } from './MappingManager';
import { markInvoiceAsPaid } from '@/lib/accounting/actions';

interface DocumentDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    document: AccountingDocument;
}

export function DocumentDetailModal({ open, onOpenChange, document }: DocumentDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'detail' | 'mapping' | 'raw'>('detail');
    const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);

    if (!open) return null;

    // Helper to extract nested data safely
    const rd = document.raw_data as any || {};
    const items = Array.isArray(rd.items) ? rd.items : [];

    // Formatting helpers
    const formatMoney = (val: string | number) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return isNaN(num) ? '-' : new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: document.currency }).format(num);
    };

    // Helper to calculate settlement amount (absolute value of negative items when total is 0)
    const settledAmount = (parseFloat(rd.total_amount || 0) === 0)
        ? items.reduce((sum: number, item: any) => {
            const price = parseFloat(item.total_price || item.total_price_vat_inclusive || 0);
            return price < 0 ? sum + Math.abs(price) : sum;
        }, 0)
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-slate-900 dark:text-slate-100">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold">Detail faktury {document.number}</h2>
                        {settledAmount > 0 && (
                            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-md">
                                Zúčtovací doklad
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {document.type === 'purchase_invoice' && (document.amount - (document.paid_amount || 0)) > 1 && (
                            <button
                                onClick={() => setShowPaymentConfirm(true)}
                                className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg transition-colors mr-2"
                            >
                                Označit jako uhrazeno
                            </button>
                        )}
                        <button onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                            ✕
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('detail')}
                        className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'detail' ? 'border-b-2 border-brand-primary text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/30' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Detail dokladu
                    </button>
                    <button
                        onClick={() => setActiveTab('mapping')}
                        className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'mapping' ? 'border-b-2 border-brand-primary text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/30' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Přiřazení k projektům
                    </button>
                    <button
                        onClick={() => setActiveTab('raw')}
                        className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'raw' ? 'border-b-2 border-brand-primary text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/30' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        Raw Data
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-white dark:bg-slate-900">
                    {activeTab === 'detail' && (
                        <div className="p-8 space-y-8">

                            {/* Top Section: Parties */}
                            <div className="grid grid-cols-2 gap-12">
                                <div>
                                    <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                                        {document.type === 'sales_invoice' ? 'Odběratel' : 'Dodavatel'}
                                    </h3>
                                    <p className="font-bold text-lg">{document.supplier_name || 'Neznámý subjekt'}</p>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                                        <p>{document.supplier_ico && <>IČO: {document.supplier_ico}</>}</p>
                                        <p>{document.supplier_dic && <>DIČ: {document.supplier_dic}</>}</p>
                                        {document.supplier_dic && rd.vat_document && (
                                            <p className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-primary text-brand-primary-foreground shadow-sm">
                                                Plátce DPH
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                        {(document.type === 'sales_invoice' ? rd.buyer_address : rd.shipper?._meta ? null : rd.supplier_address /* Fallback logic might vary */) && (
                                            /* Just a placeholder if we had full address structure, usually it's in buyer/seller link detail */
                                            /* Since we removed separate contact sync, we might not have full address unless we parse it or fetch it on demand. */
                                            /* Let's try to show what we have in raw_data, e.g. city/street if flattened, but UOL structure is nested. */
                                            /* For now sticking to Name/ICO as reliably synced. */
                                            null
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Parametry</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm justify-end inline-grid">
                                        <span className="text-gray-500">Var. symbol:</span>
                                        <span className="font-mono font-medium">{rd.variable_symbol || '-'}</span>

                                        <span className="text-gray-500">Konst. symbol:</span>
                                        <span className="font-mono">{rd.constant_symbol || '-'}</span>

                                        <span className="text-gray-500">Spec. symbol:</span>
                                        <span className="font-mono">{rd.specific_symbol || '-'}</span>

                                        <span className="text-gray-500">Způsob úhrady:</span>
                                        <span>{rd.payment_method || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dates & Amounts Row */}
                            <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">Datum vystavení</span>
                                    <span className="font-medium">{document.issue_date ? new Date(document.issue_date).toLocaleDateString('cs-CZ') : '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">Datum splatnosti</span>
                                    <span className="font-medium">{document.due_date ? new Date(document.due_date).toLocaleDateString('cs-CZ') : '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 mb-1">DUZP</span>
                                    <span className="font-medium">{document.tax_date ? new Date(document.tax_date).toLocaleDateString('cs-CZ') : (rd.tax_payment_date ? new Date(rd.tax_payment_date).toLocaleDateString('cs-CZ') : (rd.tax_date ? new Date(rd.tax_date).toLocaleDateString('cs-CZ') : '-'))}</span>
                                </div>
                                <div className="text-right flex flex-col items-end justify-center">
                                    <span className="block text-xs text-gray-500 mb-1">
                                        {settledAmount > 0 && parseFloat(rd.total_amount || 0) === 0 ? 'Celková částka' : 'Celkem k úhradě'}
                                    </span>
                                    {/* Using total_amount from raw_data as the final payment amount (with VAT) */}
                                    <div className="flex flex-col items-end">
                                        <span className="font-bold text-lg px-3 py-1 bg-brand-primary text-brand-primary-foreground rounded-lg shadow-sm whitespace-nowrap">
                                            {formatMoney(settledAmount > 0 && parseFloat(rd.total_amount || 0) === 0 ? settledAmount : rd.total_amount)}
                                        </span>
                                        {settledAmount > 0 && parseFloat(rd.total_amount || 0) === 0 && (
                                            <span className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                                                Uhrazeno zálohou (K úhradě: 0 Kč)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div>
                                <h3 className="text-sm font-semibold mb-3">Položky faktury</h3>
                                <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-gray-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Popis</th>
                                                <th className="px-4 py-2 text-right w-24">Množství</th>
                                                <th className="px-4 py-2 text-right w-32">Cena/MJ</th>
                                                <th className="px-4 py-2 text-right w-32">DPH</th>
                                                <th className="px-4 py-2 text-right w-32">Celkem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {items.map((item: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-2">{item.name || item.description || '-'}</td>
                                                    <td className="px-4 py-2 text-right">{item.quantity || '1'} {item.unit || 'ks'}</td>
                                                    <td className="px-4 py-2 text-right">{formatMoney(item.unit_price || item.unit_price_vat_exclusive || 0)}</td>
                                                    <td className="px-4 py-2 text-right">{item.vat_rate || item.vat_percent || '0'} %</td>
                                                    <td className="px-4 py-2 text-right font-medium">
                                                        {formatMoney(
                                                            item.total_price ||
                                                            item.total_price_vat_inclusive ||
                                                            (parseFloat(item.quantity || '0') * parseFloat(item.unit_price_vat_inclusive || '0')) ||
                                                            0
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {items.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-4 text-center text-gray-500 italic">
                                                        Žádné položky (nebo nejsou v API odpovědi)
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {/* Total Summary Footer */}
                                        <tfoot className="bg-slate-50 dark:bg-slate-800 font-medium">
                                            <tr>
                                                <td colSpan={3}></td>
                                                <td className="px-4 py-2 text-right text-gray-500">Základ:</td>
                                                <td className="px-4 py-2 text-right">{formatMoney(document.amount)}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan={3}></td>
                                                <td className="px-4 py-2 text-right text-gray-500">DPH:</td>
                                                <td className="px-4 py-2 text-right">{formatMoney((parseFloat(rd.total_amount || 0) - document.amount))}</td>
                                            </tr>
                                            <tr className="text-lg border-t dark:border-slate-700">
                                                <td colSpan={3}></td>
                                                <td className="px-4 py-3 text-right font-bold">Celkem:</td>
                                                <td className="px-4 py-3 text-right font-bold">{formatMoney(rd.total_amount)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Description / Bank */}
                            <div className="grid grid-cols-2 gap-8 text-sm text-gray-600 dark:text-gray-400">
                                <div>
                                    <span className="block text-xs text-gray-500 uppercase mb-1">Poznámka / Popis</span>
                                    <p className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded">{document.description || rd.text || 'Bez poznámky'}</p>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500 uppercase mb-1">Bankovní spojení</span>
                                    <p className="p-3">
                                        {rd.bank_account?.account_number ? `${rd.bank_account.account_number}/${rd.bank_account.bank_code}` : (rd.bank_account?.bank_account_id || '-')}
                                        <br />
                                        <span className="text-xs text-gray-500">IBAN: {rd.bank_account?.iban || '-'}</span>
                                    </p>
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'mapping' && (
                        <MappingManager
                            document={document}
                            overrideTotalAmount={settledAmount > 0 && parseFloat(rd.total_amount || 0) === 0 ? settledAmount : undefined}
                        />
                    )}

                    {activeTab === 'raw' && (
                        <div className="p-4">
                            <pre className="text-xs p-4 bg-gray-100 dark:bg-slate-950 rounded-lg overflow-auto border border-gray-200 dark:border-slate-800 h-full max-h-[600px]">
                                {JSON.stringify(document.raw_data, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
            {showPaymentConfirm && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="space-y-2 text-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Potvrzení úhrady</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Opravdu chcete označit tuto fakturu jako uhrazenou? Tato akce ručně nastaví stav "Uhrazeno".
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => setShowPaymentConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={async () => {
                                    await markInvoiceAsPaid(document.id, document.amount);
                                    setShowPaymentConfirm(false);
                                    onOpenChange(false);
                                }}
                                className="px-4 py-2 text-sm font-medium text-brand-primary-foreground bg-brand-primary hover:bg-brand-primary/90 dark:text-slate-900 rounded-lg transition-colors shadow-lg shadow-brand-primary/20"
                            >
                                Potvrdit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
