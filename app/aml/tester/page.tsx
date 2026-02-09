'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';

export default function AMLTesterPage() {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        dob: '',
        country: 'CZ'
    });
    const [results, setResults] = useState<any>(null);

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResults(null);

        try {
            const res = await fetch('/api/aml/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (res.ok) {
                setResults(data);
                if (data.status === 'clean') toast.success('Entity is clean');
                else toast.warning('Potential matches found');
            } else {
                toast.error(data.error || 'Check failed');
            }
        } catch (err: unknown) {
            toast.error('Error: ' + getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">AML Match Tester</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Form */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700">
                        <h3 className="font-semibold mb-4 dark:text-gray-200">Test Input</h3>
                        <form onSubmit={handleCheck} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Vladimir Putin"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth (Optional)</label>
                                <input
                                    type="date"
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    value={form.dob}
                                    onChange={e => setForm({ ...form, dob: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country Code (ISO 2)</label>
                                <input
                                    type="text"
                                    maxLength={2}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 dark:bg-slate-800 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    value={form.country}
                                    onChange={e => setForm({ ...form, country: e.target.value.toUpperCase() })}
                                    placeholder="RU"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {loading ? 'Checking...' : 'Run Check'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Results */}
                <div className="lg:col-span-2 space-y-4">
                    {results && (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="font-bold dark:text-white">Check Results</h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${results.riskRating === 'critical'
                                    ? 'bg-red-100 text-red-700'
                                    : results.riskRating === 'high'
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                    {results.riskRating.toUpperCase()} RISK
                                </span>
                            </div>

                            <div className="p-6">
                                {results.hits.length === 0 ? (
                                    <div className="text-center py-8 text-green-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="font-medium">No matches found. Entity appears clear.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                                            <tr>
                                                <th className="p-3">Matched Name</th>
                                                <th className="p-3">Source</th>
                                                <th className="p-3 text-right">Total Score</th>
                                                <th className="p-3 text-right text-xs">Name</th>
                                                <th className="p-3 text-right text-xs">DOB</th>
                                                <th className="p-3 text-right text-xs">Country</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                            {results.hits.map((hit: any, i: number) => (
                                                <RowWithDetails key={i} hit={hit} />
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Debug Metadata */}
                            {results.metadata && (
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 font-mono">
                                    <p>Provider: {results.metadata.provider}</p>
                                    <p>Checked At: {results.metadata.checkedAt}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Separate component for expandable row with Rich Details
function RowWithDetails({ hit }: { hit: any }) {
    const [expanded, setExpanded] = useState(false);
    const d = hit.rawDetails || {};

    return (
        <>
            <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onClick={() => setExpanded(!expanded)}>
                <td className="p-3 font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs w-4">{expanded ? '▼' : '▶'}</span>
                        <div>
                            {hit.matchedName}
                            <div className="text-xs text-gray-500 font-normal">
                                {d.entityInfo?.function ? d.entityInfo.function : hit.details}
                            </div>
                        </div>
                    </div>
                </td>
                <td className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {hit.listName}
                    </span>
                </td>
                <td className={`p-3 text-right font-bold ${hit.matchScore >= 85 ? 'text-red-600' : 'text-gray-600'}`}>
                    {hit.matchScore}%
                </td>
                <td className="p-3 text-right text-gray-500">{hit.scoring?.nameScore ?? '-'}%</td>
                <td className="p-3 text-right text-gray-500">{hit.scoring?.dobScore ?? '-'}%</td>
                <td className="p-3 text-right text-gray-500">{hit.scoring?.countryScore ?? '-'}%</td>
            </tr>

            {expanded && (
                <tr className="bg-gray-50/50 dark:bg-slate-800/20 shadow-inner">
                    <td colSpan={6} className="p-0">
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm border-t border-gray-200 dark:border-slate-700">

                            {/* Column 1: Core Entity Info */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2 mb-2 flex items-center gap-2">
                                    <span className="text-lg">👤</span> Personal Info
                                </h4>

                                {d.entityInfo && (
                                    <div className="space-y-1">
                                        <div className="grid grid-cols-3 text-gray-500 dark:text-gray-400">Type:</div>
                                        <div className="col-span-2 font-medium">{d.entityInfo.subjectType} ({d.entityInfo.subjectClassification})</div>

                                        <div className="grid grid-cols-3 text-gray-500 dark:text-gray-400">Desig. Date:</div>
                                        <div className="col-span-2 font-medium">{d.entityInfo.designationDate}</div>

                                        <div className="grid grid-cols-3 text-gray-500 dark:text-gray-400">Logical ID:</div>
                                        <div className="col-span-2 font-mono text-xs">{d.entityInfo.logicalId}</div>
                                    </div>
                                )}

                                {d.birthDates && d.birthDates.length > 0 && (
                                    <div className="pt-2">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Birth Details</h5>
                                        <ul className="space-y-2">
                                            {d.birthDates.map((b: any, i: number) => (
                                                <li key={i} className="bg-white dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700">
                                                    <div className="font-medium">{b.date || 'Unknown Date'}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {[b.city, b.country, b.place].filter(Boolean).join(', ')}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Column 2: Aliases & Identities */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2 mb-2 flex items-center gap-2">
                                    <span className="text-lg">🏷️</span> Identities
                                </h4>

                                {d.nameAliases && d.nameAliases.length > 0 && (
                                    <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1 sticky top-0 bg-gray-50 dark:bg-slate-900 z-10">Aliases ({d.nameAliases.length})</h5>
                                        <ul className="space-y-1 text-xs">
                                            {d.nameAliases.map((a: any, i: number) => (
                                                <li key={i} className={`p-1.5 rounded ${a.isStrong ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-400' : 'bg-gray-100 dark:bg-slate-800'}`}>
                                                    <div className="font-bold">{a.wholeName}</div>
                                                    {(a.function || a.title) && <div className="text-gray-500 italic">{[a.title, a.function].filter(Boolean).join(', ')}</div>}
                                                    {a.language && <span className="inline-block px-1 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-[10px] uppercase font-mono mt-1">{a.language}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {d.identifications && d.identifications.length > 0 && (
                                    <div className="pt-2">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Documents</h5>
                                        <ul className="space-y-1 text-xs">
                                            {d.identifications.map((id: any, i: number) => (
                                                <li key={i} className="flex justify-between border-b border-gray-200 dark:border-slate-700 py-1">
                                                    <span className="text-gray-500">{id.type}:</span>
                                                    <span className="font-mono">{id.number} ({id.countryIso})</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Column 3: Legal & Location */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2 mb-2 flex items-center gap-2">
                                    <span className="text-lg">⚖️</span> Legal Basis
                                </h4>

                                {d.regulations && d.regulations.length > 0 ? (
                                    <ul className="space-y-2">
                                        {d.regulations.map((reg: any, i: number) => (
                                            <li key={i} className="bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-100 dark:border-blue-900">
                                                <a href={reg.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium hover:underline block truncate" title={reg.title}>
                                                    {reg.title || 'Official Journal PDF'} ↗
                                                </a>
                                                <div className="text-xs text-blue-400 dark:text-blue-500 mt-1">
                                                    {reg.date} • {reg.type}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <div className="text-gray-400 italic">No direct regulation links found.</div>}

                                {d.addresses && d.addresses.length > 0 && (
                                    <div className="pt-4">
                                        <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Known Addresses</h5>
                                        <ul className="space-y-2">
                                            {d.addresses.map((a: any, i: number) => (
                                                <li key={i} className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 p-2 rounded">
                                                    {a.street && <div className="font-medium">{a.street}</div>}
                                                    <div>{[a.zip, a.city, a.country].filter(Boolean).join(', ')}</div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
