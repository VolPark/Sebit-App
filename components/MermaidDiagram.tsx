'use client';

import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';

export default function MermaidDiagram({ code }: { code: string }) {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
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

    // Debounce code updates to prevent flickering/crashing on partial streams
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedCode(code);
        }, 1500); // Wait 1.5s for the stream to stabilize/finish

        return () => clearTimeout(handler);
    }, [code]);

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

            try {
                // Config based on current theme
                mermaid.initialize({
                    startOnLoad: false,
                    theme: isDark ? 'dark' : 'neutral',
                    securityLevel: 'loose',
                    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                    themeVariables: {
                        // Pie Chart Colors (Standard App Palette)
                        pie1: '#E30613', // Red (Primary)
                        pie2: '#3b82f6', // Blue-500
                        pie3: '#22c55e', // Green-500
                        pie4: '#f97316', // Orange-500
                        pie5: '#eab308', // Yellow-500
                        pie6: '#a855f7', // Purple-500
                        pie7: '#ec4899', // Pink-500
                        pie8: '#64748b', // Slate-500
                        pie9: '#14b8a6', // Teal-500
                        pie10: '#6366f1', // Indigo-500
                        // Dark mode specific adjustments would be handled by Mermaid's internal logic if theme is 'dark'
                        // but explicit variables might override.
                    }
                });

                // Validate syntax first
                await mermaid.parse(cleanCode);

                const { svg } = await mermaid.render(renderId, cleanCode);

                // Only update provided we successfully rendered
                setSvg(svg);
                setError(null);
            } catch (err: any) {
                // Auto-recovery for specific known errors (e.g. linkStyle out of bounds)
                if (err?.message?.includes("Cannot set properties of undefined (setting 'style')") ||
                    err?.message?.includes("Cannot read properties of undefined (reading 'style')")) {
                    console.warn('[Mermaid] Recovering from linkStyle error by stripping styles...');
                    const recoveredCode = cleanCode.replace(/^.*linkStyle.*$/gm, '').trim();
                    try {
                        const { svg } = await mermaid.render(renderId + 'R', recoveredCode);
                        setSvg(svg);
                        setError(null);
                        return;
                    } catch (retryErr) {
                        console.error('[Mermaid] Recovery failed:', retryErr);
                    }
                }

                console.error('[Mermaid] Render error:', err);
                setError(String(err));
            }
        };

        renderDiagram();
    }, [debouncedCode, renderId, isDark]);

    // If we have an existing SVG, show it even if there is a new error (unless it's null text)
    // To prevent flashing, we only show error if strictly no SVG is available OR if error specifically requested?
    // Actually, improved UX: If error exists but we have stale SVG, show Stale SVG with a small warning overlay?
    // For now, simpler: If error exists, show error. Debounce handles the transient state.

    if (error) {
        return (
            <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm font-mono whitespace-pre-wrap transition-opacity duration-300">
                <p className="font-bold mb-2">Chyba při vykreslování diagramu:</p>
                <div className="mb-2 text-xs text-gray-500">Raw Error: {error}</div>
                <div className="bg-white p-2 border rounded overflow-auto max-h-40">
                    {debouncedCode}
                </div>
            </div>
        );
    }

    if (!svg) {
        return (
            <div className="animate-pulse flex space-x-4 p-4 border rounded-xl border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-5/6"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="mermaid-container my-6 p-4 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 shadow-sm overflow-x-auto flex justify-center transition-all duration-500 ease-in-out opacity-100"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
