'use client';

import { useState } from 'react';
import UserManagement from './UserManagement';
import DivisionsManagement from './DivisionsManagement';
import SuppliersManagement from './SuppliersManagement';
import { UserData } from '@/app/actions/user-management';
import { Division } from '@/lib/types/divisions';

interface ClientAdminTabsProps {
    users: UserData[];
    divisions: Division[];
}

export default function ClientAdminTabs({ users, divisions }: ClientAdminTabsProps) {
    const [activeTab, setActiveTab] = useState<'users' | 'divisions' | 'suppliers'>('users');

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Administrace</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Správa firmy, uživatelů a nastavení.
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'users'
                                ? 'border-[#E30613] text-[#E30613] dark:text-[#ff4d5a]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                        `}
                    >
                        Uživatelé a Role
                    </button>
                    <button
                        onClick={() => setActiveTab('divisions')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'divisions'
                                ? 'border-[#E30613] text-[#E30613] dark:text-[#ff4d5a]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                        `}
                    >
                        Divize
                    </button>
                    <button
                        onClick={() => setActiveTab('suppliers')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'suppliers'
                                ? 'border-[#E30613] text-[#E30613] dark:text-[#ff4d5a]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                        `}
                    >
                        Dodavatelé
                    </button>
                </nav>
            </div>

            {/* Content */}
            {activeTab === 'users' && <UserManagement initialUsers={users} />}
            {activeTab === 'divisions' && <DivisionsManagement initialDivisions={divisions} />}
            {activeTab === 'suppliers' && <SuppliersManagement />}
        </div>
    );
}
