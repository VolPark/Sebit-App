'use client';

// Mock Cases
const cases = [
    { id: 'CASE-20240113-882', title: 'Suspicious Transaction - High Volume', entity: 'Volodymyr Trading', status: 'INVESTIGATING', priority: 'HIGH', assignedTo: 'Jan Novák' },
    { id: 'CASE-20240112-441', title: 'Sanction Hit - Name Match', entity: 'Petr Svoboda', status: 'NEW', priority: 'CRITICAL', assignedTo: 'Unassigned' },
    { id: 'CASE-20240110-123', title: 'Periodic Review', entity: 'ABC Construction', status: 'CLOSED', priority: 'LOW', assignedTo: 'Maria Dvorak' },
];

export default function AmlCasesPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Case Management</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    + New Case
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-slate-200/80 dark:ring-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                        <tr>
                            <th className="p-4">Case ID</th>
                            <th className="p-4">Title</th>
                            <th className="p-4">Entity</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Priority</th>
                            <th className="p-4 text-right">Assigned To</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {cases.map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer">
                                <td className="p-4 font-mono text-gray-500">{c.id}</td>
                                <td className="p-4 font-medium text-gray-900 dark:text-white">{c.title}</td>
                                <td className="p-4 text-gray-700 dark:text-gray-300">{c.entity}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${c.status === 'NEW' ? 'bg-blue-100 text-blue-700' :
                                            c.status === 'INVESTIGATING' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {c.status}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`font-bold ${c.priority === 'CRITICAL' ? 'text-red-700' :
                                            c.priority === 'HIGH' ? 'text-orange-600' :
                                                'text-gray-600'
                                        }`}>
                                        {c.priority}
                                    </span>
                                </td>
                                <td className="p-4 text-right text-gray-500">{c.assignedTo}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
