'use client';

interface BetaToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

export default function BetaToggle({ enabled, onChange }: BetaToggleProps) {
    return (
        <label className="inline-flex items-center cursor-pointer">
            <span className="mr-2 px-2 py-0.5 text-xs font-bold rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                BETA
            </span>
            <span className="relative">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => onChange(!enabled)}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-500/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
            </span>
        </label>
    );
}
