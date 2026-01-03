'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountingReportsPage() {
    const router = useRouter();

    useEffect(() => {
        router.push('/accounting');
    }, [router]);

    return null;
}
