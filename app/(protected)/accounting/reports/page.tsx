'use client';

import { GeneralLedgerTile } from '@/components/accounting/reports/GeneralLedgerTile';
import { BalanceSheetTile } from '@/components/accounting/reports/BalanceSheetTile';
import { ProfitLossTile } from '@/components/accounting/reports/ProfitLossTile';
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


                {/* Placeholders for Future Reports */}
                {/* Balance Sheet Tile */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-64 md:h-auto min-h-[16rem]">
                    <BalanceSheetTile />
                </div>

                {/* Profit & Loss Tile (Výsledovka) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-64 md:h-auto min-h-[16rem]">
                    <ProfitLossTile />
                </div>
                {/* General Ledger Tile */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-64 md:h-auto min-h-[16rem]">
                    <GeneralLedgerTile />
                </div>


            </div>
        </div>
    );
}
