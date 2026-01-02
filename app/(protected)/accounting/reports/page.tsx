'use client';

import { BankAccountsTile } from '@/components/accounting/reports/BankAccountsTile';
import { GeneralLedgerTile } from '@/components/accounting/reports/GeneralLedgerTile';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MainBookSync } from '@/components/accounting/reports/MainBookSync';

export default function AccountingReportsPage() {
    const router = useRouter();

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/accounting" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Účetní reporty</h1>
                    <p className="text-muted-foreground text-slate-500">Finanční přehledy a stavy účtů</p>
                </div>
                <div className="ml-auto">
                    <MainBookSync />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Bank Accounts Tile (Live Data) */}
                <div className="md:col-span-2 lg:col-span-2 xl:col-span-2 min-h-[16rem]">
                    <BankAccountsTile />
                </div>

                {/* Placeholders for Future Reports */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-center items-center text-center opacity-60">
                    <div className="font-semibold mb-2">Rozvaha</div>
                    <div className="text-xs text-slate-500">Bude implementováno</div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-center items-center text-center opacity-60">
                    <div className="font-semibold mb-2">Výsledovka</div>
                    <div className="text-xs text-slate-500">Bude implementováno</div>
                </div>
                {/* General Ledger Tile */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-64 md:h-auto min-h-[16rem]">
                    <GeneralLedgerTile />
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col justify-center items-center text-center opacity-60">
                    <div className="font-semibold mb-2">Výsledovka</div>
                    <div className="text-xs text-slate-500">Bude implementováno</div>
                </div>
            </div>
        </div>
    );
}
