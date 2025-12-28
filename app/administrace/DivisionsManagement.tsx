'use client';

import { useState } from 'react';
import { Division } from '@/lib/types/divisions';
import { createDivision, deleteDivision, updateDivision } from '@/app/actions/divisions';

interface DivisionsManagementProps {
    initialDivisions: Division[];
}

export default function DivisionsManagement({ initialDivisions }: DivisionsManagementProps) {
    const [divisions, setDivisions] = useState<Division[]>(initialDivisions);
    const [newDivisionName, setNewDivisionName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDivisionName.trim()) return;

        try {
            setIsLoading(true);
            const newDivision = await createDivision(newDivisionName);
            setDivisions([...divisions, newDivision]);
            setNewDivisionName('');
        } catch (error) {
            console.error(error);
            alert('Nepodařilo se vytvořit divizi.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editName.trim()) return;

        try {
            setIsLoading(true);
            await updateDivision(id, editName);
            setDivisions(divisions.map(d => d.id === id ? { ...d, nazev: editName } : d));
            setEditingId(null);
            setEditName('');
        } catch (error) {
            console.error(error);
            alert('Nepodařilo se upravit divizi.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Opravdu chcete smazat tuto divizi? To může ovlivnit existující data.')) return;

        try {
            setIsLoading(true);
            await deleteDivision(id);
            setDivisions(divisions.filter(d => d.id !== id));
        } catch (error) {
            console.error(error);
            alert('Nepodařilo se smazat divizi.');
        } finally {
            setIsLoading(false);
        }
    };

    const startEditing = (division: Division) => {
        setEditingId(division.id);
        setEditName(division.nazev);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditName('');
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Divize firmy</h2>

            {/* Create Form */}
            <form onSubmit={handleCreate} className="flex gap-4">
                <div className="flex-1">
                    <label htmlFor="newDivision" className="sr-only">Nová divize</label>
                    <input
                        type="text"
                        id="newDivision"
                        value={newDivisionName}
                        onChange={(e) => setNewDivisionName(e.target.value)}
                        placeholder="Zadejte název nové divize (např. Truhlárna)"
                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[#E30613] focus:border-[#E30613] bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !newDivisionName.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#E30613] hover:bg-[#c90511] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E30613] disabled:opacity-50"
                >
                    {isLoading ? 'Ukládám...' : 'Přidat divizi'}
                </button>
            </form>

            <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {divisions.map((division) => (
                        <li key={division.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            {editingId === division.id ? (
                                <div className="flex items-center gap-2 flex-1 mr-4">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-[#E30613] focus:border-[#E30613] bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleUpdate(division.id)}
                                        className="text-green-600 hover:text-green-700 p-1"
                                        title="Uložit"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        className="text-gray-400 hover:text-gray-500 p-1"
                                        title="Zrušit"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <span className="text-gray-900 dark:text-white font-medium">{division.nazev}</span>
                            )}

                            {editingId !== division.id && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => startEditing(division)}
                                        className="text-gray-400 hover:text-blue-500 p-2 transition-colors"
                                        title="Upravit"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(division.id)}
                                        className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                                        title="Odstranit"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                    {divisions.length === 0 && (
                        <li className="p-8 text-center text-gray-500 dark:text-gray-400">
                            Zatím nebyly vytvořeny žádné divize.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
