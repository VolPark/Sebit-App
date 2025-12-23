import { Suspense } from 'react';
import OffersTable from '@/components/OffersTable';

export default function NabidkyPage() {
    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto dark:text-gray-100">
            <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Správa cenových nabídek pro klienty</h2>


            <Suspense fallback={<div className="text-zinc-500">Načítám komponentu...</div>}>
                <OffersTable />
            </Suspense>
        </div>

    );
}
