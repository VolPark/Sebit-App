'use client';

import { useState } from 'react';
import { UserData, deleteUser, inviteUser, updateUserRole, updateUserName } from '@/app/actions/user-management';

export default function UserManagement({ initialUsers }: { initialUsers: UserData[] }) {
    const [users, setUsers] = useState<UserData[]>(initialUsers);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Invite Form State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            setIsLoading(true);
            await updateUserRole(userId, newRole);
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error(error);
            alert('Nepodařilo se změnit roli.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNameUpdate = async (userId: string, newName: string) => {
        const originalName = users.find(u => u.id === userId)?.name;
        if (newName === originalName) return; // No change

        try {
            setIsLoading(true);
            await updateUserName(userId, newName);
            setUsers(users.map(u => u.id === userId ? { ...u, name: newName } : u));
        } catch (error) {
            console.error(error);
            alert('Nepodařilo se změnit jméno.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Opravdu chcete odstranit tohoto uživatele?')) return;

        try {
            setIsLoading(true);
            await deleteUser(userId);
            setUsers(users.filter(u => u.id !== userId));
        } catch (error) {
            console.error(error);
            alert('Nepodařilo se odstranit uživatele.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            await inviteUser(inviteEmail, inviteRole);
            setIsInviteModalOpen(false);
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error(error);
            alert('Chyba při odesílání pozvánky: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        setInviteEmail('');
        setInviteRole('member');
        window.location.reload();
    };

    const roles = ['owner', 'admin', 'office', 'reporter'];

    const roleDescriptions: Record<string, string> = {
        owner: 'Majitel - Plný přístup ke všemu, včetně správy uživatelů a nastavení firmy.',
        admin: 'Administrátor - Kompletní správa aplikace, uživatelů a nastavení.',
        office: 'Kancelář - Řízení zakázek a financí. Nemá přístup k manažerským přehledům (Dashboard) a výsledkům firmy.',
        reporter: 'Reportér - Omezený přístup pouze k zápisu a prohlížení výkazů.'
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Uživatelé a Role</h2>
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-[#E30613] hover:bg-[#c90511] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                    Pozvat uživatele
                </button>
            </div>

            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Jméno
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Email
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Metoda
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Role
                                </th>

                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Poslední přihlášení
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Akce</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#1f2937] divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center group">
                                            <input
                                                type="text"
                                                defaultValue={user.name === 'Neznámý' ? '' : user.name}
                                                placeholder="Neznámý"
                                                className="block w-full text-sm font-medium text-gray-900 dark:text-white bg-transparent border-transparent focus:border-gray-300 focus:ring-0 rounded-md px-2 py-1 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                onBlur={(e) => handleNameUpdate(user.id, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.currentTarget.blur();
                                                    }
                                                }}
                                            />
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 pointer-events-none">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                            </svg>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-300">{user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex gap-1 flex-wrap">
                                            {user.providers?.map((provider) => (
                                                <span key={provider} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                                                    {provider}
                                                </span>
                                            )) || <span className="text-gray-400 text-xs">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                disabled={isLoading}
                                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-[#E30613] focus:border-[#E30613] sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            >
                                                {roles.map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={roleDescriptions[user.role]}>
                                                {roleDescriptions[user.role]}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('cs-CZ') + ' ' + new Date(user.last_sign_in_at).toLocaleTimeString('cs-CZ') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition"
                                            title="Odstranit"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Přehled a oprávnění rolí</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(roleDescriptions).map(([role, desc]) => (
                        <div key={role} className="bg-white dark:bg-[#1f2937] p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
                            <div className="font-bold text-[#E30613] mb-1 capitalize">{role}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">{desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500/75 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1f2937] rounded-lg shadow-xl max-w-lg w-full overflow-hidden transform transition-all">
                        <form onSubmit={handleInvite}>
                            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4" id="modal-title">
                                    Pozvat nového uživatele
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            id="email"
                                            required
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#E30613] focus:border-[#E30613] bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Role
                                        </label>
                                        <select
                                            id="role"
                                            name="role"
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value)}
                                            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#E30613] focus:border-[#E30613] bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                                        >
                                            {roles.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                        <div className="mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-800 flex gap-3 items-start">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#E30613] dark:text-red-400 flex-shrink-0 mt-0.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                            </svg>
                                            <p className="text-sm text-[#E30613] dark:text-red-300">
                                                {roleDescriptions[inviteRole]}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#E30613] text-base font-medium text-white hover:bg-[#c90511] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E30613] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    {isLoading ? 'Odesílání...' : 'Odeslat pozvánku'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setIsInviteModalOpen(false)}
                                >
                                    Zrušit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500/75 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#1f2937] rounded-lg shadow-xl max-w-sm w-full overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-green-600 dark:text-green-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-2">
                                Pozvánka odeslána
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Pozvánka byla úspěšně odeslána na email <span className="font-semibold text-gray-900 dark:text-white">{inviteEmail}</span>.
                            </p>
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#E30613] text-base font-medium text-white hover:bg-[#c90511] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E30613] sm:text-sm"
                                onClick={handleSuccessClose}
                            >
                                Skvělé, díky
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
