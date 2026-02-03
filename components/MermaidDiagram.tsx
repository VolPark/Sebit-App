'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
    code: string;
    isLoading?: boolean;
}

function MermaidDiagram({ code, isLoading = false }: MermaidDiagramProps) {
    const [svg, setSvg] = useState<string>('');
    // Error state now tracks: { message: string, isPermanent: boolean }
    const [error, setError] = useState<{ message: string; isPermanent: boolean } | null>(null);
    const uniqueId = useId().replace(/:/g, '');
    const renderId = `mermaid-${uniqueId}`;
    const [isDark, setIsDark] = useState(false);

    // We keep track of the last rendered code to debounce updates
    const [debouncedCode, setDebouncedCode] = useState(code);

    useEffect(() => {
        // Simple dark mode detection
        const checkDark = () => document.documentElement.classList.contains('dark');
        setIsDark(checkDark());

        const observer = new MutationObserver(() => {
            setIsDark(checkDark());
        });

        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Debounce: Shorten to 1s for responsiveness, but enough to avoid partial-stream renders
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedCode(code);
        }, 1000);

        return () => clearTimeout(handler);
    }, [code]);

    // Reset error when code changes (optimistic UI)
    useEffect(() => {
        if (code !== debouncedCode) {
            // We are streaming/typing, so don't show old errors if they might go away
            // However, keep the OLD SVG visible if we have it!
        }
    }, [code, debouncedCode]);

    useEffect(() => {
        const renderDiagram = async () => {
            if (!debouncedCode) return;

            // Clean code logic...
            let cleanCode = debouncedCode.trim();

            // Remove markdown code block delimiters if present
            cleanCode = cleanCode.replace(/^```mermaid\s*/i, '').replace(/```$/, '').trim();

            // Remove "mermaid" keyword if it's the very first word (case insensitive)
            if (/^mermaid\s/i.test(cleanCode) || cleanCode.toLowerCase() === 'mermaid') {
                cleanCode = cleanCode.replace(/^mermaid\s*/i, '').trim();
            }

            // Remove wrapping quotes if explicitly present around the whole block
            if (cleanCode.startsWith('"') && cleanCode.endsWith('"')) {
                cleanCode = cleanCode.substring(1, cleanCode.length - 1).trim();
            }

            // Fix: Replace smart quotes with standard quotes
            cleanCode = cleanCode.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

            // Fix: remove HTML entities
            cleanCode = cleanCode.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

            // Fix: Autocorrect invalid graph directions often hallucinated by AI
            if (/^graph\s+AR\b/i.test(cleanCode)) {
                cleanCode = cleanCode.replace(/^graph\s+AR/i, 'graph LR');
            }
            const validDirections = ['TB', 'TD', 'BT', 'RL', 'LR'];
            const graphMatch = /^graph\s+(\w+)/i.exec(cleanCode);
            if (graphMatch && !validDirections.includes(graphMatch[1].toUpperCase())) {
                cleanCode = cleanCode.replace(/^graph\s+\w+/i, 'graph TD');
            }

            // Fix: Gantt chart percentage hallucination
            if (/^\s*gantt\b/i.test(cleanCode)) {
                const ganttLineRegex = /:\s*([^,]+),\s*(active|done|crit|milestone),\s*(\d{4}-\d{2}-\d{2}),\s*(\d+\s*%)\s*$/gm;
                cleanCode = cleanCode.replace(ganttLineRegex, (match, title, status, date, percent) => {
                    return `: ${title.trim()} (${percent.trim()}), ${status}, ${date}, 30d`;
                });
            }

            // Fix: Subgraph syntax error (spaces/parens without quotes)
            cleanCode = cleanCode.replace(/^\s*subgraph\s+(?!["a-zA-Z0-9_]+\s*\[)([^"\[\n\r]+)(?<!\s)$/gm, (match, title) => {
                if (/[ ()]/.test(title) && !/^".*"$/.test(title.trim())) {
                    return `subgraph "${title.trim()}"`;
                }
                return match;
            });

            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: isDark ? 'dark' : 'neutral',
                    securityLevel: 'strict',
                    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                    themeVariables: {
                        pie1: '#E30613',
                        pie2: '#3b82f6',
                        pie3: '#22c55e',
                        pie4: '#f97316',
                        pie5: '#eab308',
                        pie6: '#a855f7',
                        pie7: '#ec4899',
                        pie8: '#64748b',
                        pie9: '#14b8a6',
                        pie10: '#6366f1',
                    }
                });

                await mermaid.parse(cleanCode);
                const { svg } = await mermaid.render(renderId, cleanCode);

                setSvg(svg);
                setError(null);
            } catch (err: any) {
                // Auto-recovery for linkStyle
                if (err?.message?.includes("Cannot set properties of undefined (setting 'style')") ||
                    err?.message?.includes("Cannot read properties of undefined (reading 'style')")) {
                    const recoveredCode = cleanCode.replace(/^.*linkStyle.*$/gm, '').trim();
                    try {
                        const { svg } = await mermaid.render(renderId + 'R', recoveredCode);
                        setSvg(svg);
                        setError(null);
                        return;
                    } catch (retryErr) {
                        // ignore retry fail, fall through to main error
                    }
                }

                // If we fail, only show the error if we don't have a previous valid SVG to show
                // OR if the code hasn't changed for a while (implying permanent failure)
                setError({ message: String(err), isPermanent: true });
            }
        };

        renderDiagram();
    }, [debouncedCode, renderId, isDark]);

    // If explicitly loading (streaming), always show placeholder to prevent partial renders
    if (isLoading) {
        return (
            <div className="my-6 flex flex-col space-y-4 p-6 border rounded-xl border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mx-auto animate-pulse"></div>
                <div className="flex justify-center gap-4 animate-pulse">
                    <div className="h-20 w-20 bg-gray-100 dark:bg-slate-700 rounded-full"></div>
                    <div className="h-20 w-20 bg-gray-100 dark:bg-slate-700 rounded-full"></div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mx-auto animate-pulse"></div>
                <div className="text-center text-xs text-gray-400 font-medium pt-2">Vytvářím vizualizaci...</div>
            </div>
        );
    }

    // If we have an Error, but also have a valid SVG from before, prefer showing the SVG (stale)
    // ONLY show error if we have NO SVG at all.
    if (error && !svg) {
        return (
            <div className="my-6 p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm font-mono whitespace-pre-wrap">
                <p className="font-bold mb-2">Nepodařilo se vykreslit diagram:</p>
                <div className="mb-2 text-xs text-gray-500 opacity-70 truncate">{error.message.substring(0, 100)}...</div>
                <div className="bg-white p-3 border rounded overflow-auto max-h-32 text-xs text-gray-600">
                    {debouncedCode}
                </div>
            </div>
        );
    }

    if (!svg) {
        return (
            <div className="my-6 flex flex-col space-y-4 p-6 border rounded-xl border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mx-auto animate-pulse"></div>
                <div className="flex justify-center gap-4 animate-pulse">
                    <div className="h-20 w-20 bg-gray-100 dark:bg-slate-700 rounded-full"></div>
                    <div className="h-20 w-20 bg-gray-100 dark:bg-slate-700 rounded-full"></div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mx-auto animate-pulse"></div>
                <div className="text-center text-xs text-gray-400 font-medium pt-2">Vytvářím vizualizaci...</div>
            </div>
        );
    }

    return (
        <div
            className="mermaid-container my-6 p-4 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto flex justify-center"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

// Wrap in memo to prevent re-renders from parent if props didn't change (though code usually changes)
export default React.memo(MermaidDiagram);
