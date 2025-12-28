import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MermaidDiagram from './MermaidDiagram';
import { useTypewriter } from '@/hooks/useTypewriter';

// Helper to recursive flatten text from React children
const flattenText = (children: any): string => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (Array.isArray(children)) return children.map(flattenText).join('');
    if (children?.props?.children) return flattenText(children.props.children);
    return '';
};

// Component for handling code blocks vs inline code
const CodeBlock = ({ node, inline, className, children, isLoading, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const content = String(children).trim();

    const isMermaid = match && match[1] === 'mermaid';
    const isTableRef = match && match[1] === 'table';
    const isAttributeRef = match && match[1] === 'attribute';

    // 4. Data Preview Table (for generic JSON arrays of objects)
    const isJsonData = (match && match[1] === 'json') || (!match && content.trim().startsWith('[') && content.trim().endsWith(']'));

    if (isTableRef && !inline) {
        try {
            const data = JSON.parse(content);
            return (
                <div className="my-6 relative overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-900 bg-white dark:bg-slate-900 shadow-lg group transition-all duration-300 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-24 h-24 text-blue-600 dark:text-blue-400 transform rotate-12" fill="currentColor" viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2 2v10h12V7H6zm2 2h8v2H8V9z" /></svg>
                    </div>
                    <div className="relative p-5 flex items-start gap-4 z-10">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-7 h-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 uppercase tracking-widest border border-blue-200 dark:border-blue-800">
                                    Databáze
                                </span>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                                    {data.name}
                                </h3>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                {data.description}
                            </p>
                        </div>
                    </div>
                    <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 opacity-70"></div>
                </div>
            );
        } catch (e) { }
    }

    if (isAttributeRef && !inline) {
        try {
            const data = JSON.parse(content);
            return (
                <div className="my-3 inline-flex flex-wrap items-center gap-2 pl-1 pr-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-900/40 flex items-center justify-center border border-teal-100 dark:border-teal-800 group-hover:bg-teal-100 dark:group-hover:bg-teal-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-teal-600 dark:text-teal-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
                        </svg>
                    </div>
                    <div className="flex flex-col h-full justify-center">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 leading-none mb-0.5">
                            <span className="uppercase font-bold tracking-wider">{data.table}</span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span>Atribut</span>
                        </div>
                        <div className="font-bold text-gray-800 dark:text-gray-200 text-sm leading-none flex items-center gap-2">
                            {data.name}
                            <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-slate-700">
                                {data.description}
                            </span>
                        </div>
                    </div>
                </div>
            );
        } catch (e) { }
    }

    // Check if it's a JSON Data Table (Array of Objects)
    if (isJsonData && !inline) {
        try {
            const data = JSON.parse(content);
            if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
                const keys = Object.keys(data[0]);
                // Filter out obviously internal keys if needed, or keeping them is fine for "raw" view
                // Let's filter nothing for now to be raw but standard behavior

                return (
                    <div className="my-6 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 shadow-md bg-white dark:bg-slate-900">
                        <div className="bg-gray-50 dark:bg-slate-800 px-4 py-2 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25v2.25m0 0v2.25m0-2.25h17.25M3.375 12.75v2.25m0 0h17.25" />
                                </svg>
                                Náhled dat
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                                {data.length} záznamů
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-sm">
                                <thead className="bg-white dark:bg-slate-900">
                                    <tr>
                                        {keys.map((key) => (
                                            <th key={key} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                                    {data.map((row: any, i: number) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                            {keys.map((key) => {
                                                const val = row[key];
                                                let displayVal = val;
                                                if (typeof val === 'object' && val !== null) {
                                                    displayVal = JSON.stringify(val);
                                                } else if (typeof val === 'boolean') {
                                                    displayVal = val ? 'Ano' : 'Ne';
                                                }
                                                return (
                                                    <td key={key} className="px-4 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap font-mono text-xs">
                                                        {displayVal}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            }
        } catch (e) { }
    }

    if (isMermaid && !inline) {
        return <MermaidDiagram code={content} isLoading={isLoading} />;
    }

    // Check if content looks like just a financial number (e.g. "1 234 567 CZK" or "100 Kč")
    const isFinancial = /^(?:\d{1,3}(?:\s\d{3})*|\d+)(?:[.,]\d+)?\s*(?:CZK|Kč|€|\$)$/i.test(content);

    // Check if content looks like a math formula / calculation
    const hasMathOps = /[=+\-*/]/.test(content);
    const looksLikeMath = /^[\p{L}\p{N}\s.,+\-*/()%:()\[\]=<>€$]+$/u.test(content);
    const isNotCode = !/\b(const|let|var|function|return|import|export|class|if|for|while|console)\b/.test(content);

    const isMath = hasMathOps && looksLikeMath && isNotCode && !match;

    // Check for ASCII Tree Diagram
    const isTree = (content.includes('├──') || content.includes('└──') || content.includes('│')) && content.includes('CZK');

    if (isFinancial) {
        return (
            <span className="inline-block px-3 py-1 my-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 text-sm font-mono shadow-sm">
                {children}
            </span>
        );
    }

    if (isTree && !inline) {
        const lines = content.split('\n').filter(l => l.trim().length > 0 && l.trim() !== '│');
        return (
            <div className="my-6 p-4 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex flex-col relative pl-2">
                    {/* Vertical guide line for the whole tree */}
                    <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gray-200 dark:bg-slate-700 z-0"></div>

                    {lines.map((line, idx) => {
                        // Determine type and indentation
                        const isRoot = idx === 0 && !line.includes('─');
                        const isCost = line.includes('[-]');
                        const isResult = line.includes('[=]') || line.includes('EBITDA') || line.includes('Zůstatek');
                        const isProfit = line.includes('ČISTÝ ZISK') || line.includes('PROFIT');

                        // Clean up the text
                        // Remove tree chars: ├──, └──, │, [-], [=]
                        const cleanLine = line.replace(/[│├└─]+/g, '').replace(/\[-\]|\[=\]/g, '').trim();
                        // Split label and value (usually separated by dots ..... or just space)
                        // Heuristic: Last part looks like money
                        let label = cleanLine;
                        let value = '';

                        // Attempt to split by dots "......" if present
                        if (cleanLine.includes('..')) {
                            const parts = cleanLine.split(/\.{2,}/);
                            if (parts.length > 1) {
                                label = parts[0].trim();
                                value = parts[1].trim();
                            }
                        } else {
                            // Fallback split by last known currency pattern
                            const currencyMatch = /\d[\d\s,.]*CZK.*$/.exec(cleanLine);
                            if (currencyMatch) {
                                value = currencyMatch[0];
                                label = cleanLine.replace(value, '').trim();
                            }
                        }

                        if (!label && !value) return null;

                        return (
                            <div key={idx} className={`relative z-10 flex items-start gap-3 mb-4 last:mb-0 ${isRoot ? 'mb-6' : ''}`}>
                                {/* Icon / Bullet */}
                                <div className={`
                                    flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 
                                    ${isRoot
                                        ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                                        : isProfit
                                            ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400'
                                            : isCost
                                                ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400 font-bold'
                                                : isResult
                                                    ? 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                                                    : 'bg-white border-gray-200 text-gray-400 dark:bg-slate-800 dark:border-slate-700'
                                    }
                                    shadow-sm
                                `}>
                                    {isRoot ? '🏢' : isCost ? '−' : isProfit ? '💰' : isResult ? '=' : '•'}
                                </div>

                                {/* Content Card */}
                                <div className={`flex-1 p-3 rounded-lg border ${isRoot || isProfit ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700' : 'bg-transparent border-transparent'}`}>
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1">
                                        <span className={`font-medium ${isRoot || isProfit ? 'text-gray-900 dark:text-white uppercase tracking-wide text-xs sm:text-sm' : 'text-gray-700 dark:text-gray-300 text-sm'}`}>
                                            {label}
                                        </span>
                                        {value && (
                                            <span className={`font-mono text-sm whitespace-nowrap ${isCost ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100 font-semibold'}`}>
                                                {value}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (isMath && !inline) {
        return (
            <div className="my-4 p-5 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <span>∑</span> <span>Výpočet</span>
                </div>
                <div className="text-xl md:text-2xl font-serif text-gray-800 dark:text-gray-100 italic tracking-wide">
                    {children}
                </div>
            </div>
        );
    }

    // Check for Progress Bar inside Code Block (e.g. `[████] 50%`)
    // Regex matches: Optional Label + Bar + Percentage (optional) + Optional Suffix
    const codeContent = String(children).trim();
    const progressbarRegex = /^(?:(.+?)(?:\||\(|:)\s*)?(?:Vytížení:\s*)?(?:`|\[)?\s*([█░■□=\-#\s]+)(?:`|\])?\s*(?:\|)?\s*(?:(\d+)\s*%)?(?:\s*.*)?$/i;
    const progressMatch = progressbarRegex.exec(codeContent);

    // Ensure it's actually a progress bar and not just "Label: " matching the loose regex
    // Must either have explicit percentage OR contain block characters
    const hasExplicitPercentage = progressMatch && !!progressMatch[3];
    const hasBlocks = progressMatch && /[█■░□=\-#]/.test(progressMatch[2]);

    if (progressMatch && (hasExplicitPercentage || hasBlocks) && !inline) {
        // Group 1 is Label (optional), Group 2 is Bar, Group 3 is Percentage
        const label = progressMatch[1] ? progressMatch[1].replace(/[:*`\[\]]/g, '').trim() : "Vytížení";
        let percentage = 0;

        if (progressMatch[3]) {
            percentage = parseInt(progressMatch[3], 10);
        } else {
            // Auto-calculate if percentage is missing
            const full = (progressMatch[2].match(/[█■=#]/g) || []).length;
            const empty = (progressMatch[2].match(/[░□\-]/g) || []).length;
            const total = full + empty;
            percentage = total > 0 ? Math.round((full / total) * 100) : 0;
        }

        // Choose color based on percentage
        let bgClass = "bg-blue-600";
        let gradientClass = "from-blue-500 to-blue-600";

        if (percentage >= 95) {
            bgClass = "bg-red-600";
            gradientClass = "from-red-500 to-red-600";
        } else if (percentage > 80) {
            bgClass = "bg-orange-500";
            gradientClass = "from-orange-400 to-orange-500";
        } else if (percentage < 30) {
            bgClass = "bg-green-500";
            gradientClass = "from-green-400 to-green-500";
        }

        return (
            <div className="my-2 px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col gap-1 w-full max-w-md">
                <div className="flex justify-between items-end">
                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-xs leading-tight">{label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${percentage > 90 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'}`}>
                        {percentage} %
                    </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                    <div className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`} style={{ width: `${percentage}%` }}></div>
                </div>
            </div>
        );
    }

    return !inline ? (
        <div className="my-4 rounded-lg overflow-hidden bg-[#1e1e1e] text-gray-200 shadow-md border border-gray-700">
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-700">
                <span className="text-xs font-mono text-gray-400 lowercase">{match ? match[1] : 'code'}</span>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed">
                <code className={className} {...props}>
                    {children}
                </code>
            </pre>
        </div>
    ) : (
        <code className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-red-600 dark:text-red-400 font-mono text-xs font-medium border border-gray-200 dark:border-slate-600" {...props}>
            {children}
        </code>
    );
};

// Component for handling blockquotes and alerts
const Blockquote = ({ children }: any) => {
    const findAlert = (nodes: any): string | null => {
        if (typeof nodes === 'string') return nodes;
        if (Array.isArray(nodes)) return nodes.map(findAlert).join('');
        if (nodes?.props?.children) return findAlert(nodes.props.children);
        return '';
    };

    const content = findAlert(children);
    let alertType = null;

    if (content) {
        if (content.includes('[!NOTE]')) alertType = 'note';
        else if (content.includes('[!TIP]')) alertType = 'tip';
        else if (content.includes('[!IMPORTANT]')) alertType = 'important';
        else if (content.includes('[!WARNING]')) alertType = 'warning';
        else if (content.includes('[!CAUTION]')) alertType = 'caution';
    }

    if (alertType) {
        const styles: Record<string, string> = {
            note: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-200',
            tip: 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-200',
            important: 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-800 dark:text-purple-200',
            warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-200',
            caution: 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-200',
        };

        const titles: Record<string, string> = {
            note: 'Poznámka',
            tip: 'Tip',
            important: 'Důležité',
            warning: 'Varování',
            caution: 'Pozor'
        };

        return (
            <div className={`my-4 p-4 rounded-xl border-l-4 ${styles[alertType]} shadow-sm`}>
                <div className="flex items-center gap-2 mb-2 font-bold uppercase text-xs tracking-wider opacity-90">
                    {titles[alertType]}
                </div>
                <div className="text-sm opacity-90">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 my-4 text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-slate-800/50 rounded-r-lg">
            {children}
        </blockquote>
    );
};

// Custom Paragraph/ListItem renderer to detect ASCII progress bars and Financial Waterfall
const CustomTextRenderer = ({ node, children, ...props }: any) => {
    // Flatten children to check content string properly even if it has bold/code inside
    const content = flattenText(children);

    // Regex definitions
    const progressbarRegex = /^(?:(.+?)(?:\||\(|:)\s*)?(?:Vytížení:\s*)?(?:`|\[)?\s*([█░■□=\-#\s]+)(?:`|\])?\s*(?:\|)?\s*(?:(\d+)\s*%)?(?:\s*.*)?$/i;
    // Supports: "Label: 50% progress: 50%" (keyword) OR "Cpu: 90%" (simple)
    const simpleProgressRegex = /^(.+?):\s*(\d+(?:[.,]\d+)?)\s*%?\s*$/i;
    const explicitKeywordRegex = /^(.*?)\bprogress:\s*\[?(\d+(?:[.,]\d+)?)\]?\s*%?\s*$/i;

    // Helper to render a single progress bar
    const renderProgressBar = (label: string, percentage: number, key: any) => {
        // Choose color based on percentage
        let bgClass = "bg-blue-600";
        let gradientClass = "from-blue-500 to-blue-600";

        if (percentage >= 95) {
            bgClass = "bg-red-600";
            gradientClass = "from-red-500 to-red-600";
        } else if (percentage > 80) {
            bgClass = "bg-orange-500";
            gradientClass = "from-orange-400 to-orange-500";
        } else if (percentage < 30) {
            bgClass = "bg-green-500";
            gradientClass = "from-green-400 to-green-500";
        }

        return (
            <div key={key} className="my-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-end">
                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm leading-tight">{label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${percentage > 90 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'}`}>
                        {percentage} %
                    </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-1000 ease-out relative`}
                        style={{ width: `${percentage}%` }}
                    >
                        <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')]"></div>
                    </div>
                </div>
            </div>
        );
    };

    // 1. Waterfall Check (matches whole block)
    const lines = content.split('\n').filter(l => l.trim());
    const isWaterfall = lines.length > 2 && lines.some(l => (l.includes('➖') || l.includes('=')) && l.includes('CZK'));

    if (isWaterfall) {
        return (
            <div className="my-5 flex flex-col gap-1">
                {lines.map((line, idx) => {
                    const trimmed = line.trim();
                    const isTotal = trimmed.startsWith('=');
                    const isDeduction = trimmed.startsWith('➖');

                    if (trimmed.includes(':') && trimmed.includes('CZK')) {
                        const [labelRaw, valueRaw] = trimmed.split(/:(.+)/);
                        const label = labelRaw.replace(/^[➖=+\s]+/, '').trim();
                        const value = valueRaw.trim();

                        return (
                            <div key={idx} className={`flex justify-between items-center p-3 rounded-lg ${isTotal ? 'bg-gray-100 dark:bg-slate-800 font-bold border border-gray-200 dark:border-slate-600 shadow-sm' : 'border-b border-gray-100 dark:border-slate-800 last:border-0'}`}>
                                <div className="flex items-center text-gray-700 dark:text-gray-300">
                                    {isDeduction && <span className="text-red-500 mr-2 w-5 text-center font-bold text-lg">−</span>}
                                    {isTotal && <span className="text-gray-900 dark:text-white mr-2 w-5 text-center font-bold text-lg">=</span>}
                                    {!isDeduction && !isTotal && <span className="mr-2 w-5"></span>}
                                    <span className={isTotal ? 'uppercase tracking-wide text-xs md:text-sm' : 'text-sm'}>{label}</span>
                                </div>
                                <div className={`font-mono text-sm ${isDeduction ? 'text-red-500' : (isTotal ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400')}`}>
                                    {value}
                                </div>
                            </div>
                        );
                    }
                    return <p key={idx} className="mb-2 text-gray-600 dark:text-gray-400 italic text-sm">{line}</p>;
                })}
            </div>
        );
    }

    // 2. Line-by-Line Progress Check
    // We process the children normally, but if a line acts as a progress bar, we replace it.
    // If multiple lines exist, we handle them.

    // If it's a single line, try to render directly to avoid unnecessary wrappers
    if (lines.length <= 1) {
        const line = content.trim();
        const progressMatch = progressbarRegex.exec(line);
        const simpleMatch = simpleProgressRegex.exec(line);
        const keywordMatch = explicitKeywordRegex.exec(line);

        const hasExplicitPercentage = progressMatch && !!progressMatch[3];
        const hasBlocks = progressMatch && /[█■░□=\-#]/.test(progressMatch[2]);

        if ((progressMatch && (hasExplicitPercentage || hasBlocks)) || simpleMatch || keywordMatch) {
            let label = "Vytížení";
            let percentage = 0;

            if (keywordMatch) {
                label = keywordMatch[1].trim() || "Progress";
                percentage = parseFloat(keywordMatch[2].replace(',', '.'));
            } else if (simpleMatch) {
                label = simpleMatch[1].trim();
                percentage = parseFloat(simpleMatch[2].replace(',', '.'));
            } else if (progressMatch) {
                label = progressMatch[1] ? progressMatch[1].replace(/[:*`\[\]]/g, '').trim() : "Vytížení";
                if (progressMatch[3]) percentage = parseInt(progressMatch[3], 10);
                else {
                    const full = (progressMatch[2].match(/[█■=#]/g) || []).length;
                    const total = full + (progressMatch[2].match(/[░□\-]/g) || []).length;
                    percentage = total > 0 ? Math.round((full / total) * 100) : 0;
                }
            }
            return renderProgressBar(label, percentage, 'single');
        }
    } else {
        // Multi-line content: Check EACH line for progress bar
        const renderedLines = lines.map((line, idx) => {
            const trimmed = line.trim();
            const progressMatch = progressbarRegex.exec(trimmed);
            const simpleMatch = simpleProgressRegex.exec(trimmed);
            const keywordMatch = explicitKeywordRegex.exec(trimmed);

            const hasExplicitPercentage = progressMatch && !!progressMatch[3];
            const hasBlocks = progressMatch && /[█■░□=\-#]/.test(progressMatch[2]);

            if ((progressMatch && (hasExplicitPercentage || hasBlocks)) || simpleMatch || keywordMatch) {
                let label = "Vytížení";
                let percentage = 0;

                if (keywordMatch) {
                    label = keywordMatch[1].trim() || "Progress";
                    percentage = parseFloat(keywordMatch[2].replace(',', '.'));
                } else if (simpleMatch) {
                    label = simpleMatch[1].trim();
                    percentage = parseFloat(simpleMatch[2].replace(',', '.'));
                } else if (progressMatch) {
                    label = progressMatch[1] ? progressMatch[1].replace(/[:*`\[\]]/g, '').trim() : "Vytížení";
                    if (progressMatch[3]) percentage = parseInt(progressMatch[3], 10);
                    else {
                        const full = (progressMatch[2].match(/[█■=#]/g) || []).length;
                        const total = full + (progressMatch[2].match(/[░□\-]/g) || []).length;
                        percentage = total > 0 ? Math.round((full / total) * 100) : 0;
                    }
                }
                return renderProgressBar(label, percentage, idx);
            }

            // Standard text line
            return <div key={idx} className="mb-2 last:mb-0">{trimmed}</div>;
        });

        // If we found at least one specialized component (progress bar), return the array container
        // Otherwise fall through to standard rendering to handle bold/formatting correctly
        // (This is a simplified check - if ANY line was converted, we use the custom output)
        if (renderedLines.some(res => React.isValidElement(res) && (res.type === 'div' || (res as any).props?.className?.includes('bg-white')))) {
            return <div className="space-y-1 my-2">{renderedLines}</div>;
        }
    }

    // Default rendering for non-special text
    const Tag = node.tagName === 'li' ? 'li' : 'p';
    const classes = node.tagName === 'li' ? 'pl-1' : 'mb-3 last:mb-0';

    return <Tag className={classes} {...props}>{children}</Tag>;
};

// ... (previous helper components remain unchanged)

const AiMessageBubble = React.memo(function AiMessageBubble({ role, content, isLast, isLoading }: { role: 'user' | 'assistant', content: string, isLast?: boolean, isLoading?: boolean }) {
    const isUser = role === 'user';

    // Apply typewriter effect ONLY if it's an assistant message AND it's the last one (active)
    const shouldAnimate = !isUser && isLast;
    const displayedContent = useTypewriter(content, 5, shouldAnimate);

    // Detect if we are still "typing" the message content OR if the network is loading
    const isTyping = (!isUser && isLast) && (displayedContent.length < content.length || isLoading);

    // Create custom components map with the typing state injected
    const markdownComponents = React.useMemo(() => {
        return {
            code: (props: any) => <CodeBlock {...props} isLoading={isTyping} />,
            blockquote: Blockquote,
            pre: ({ children }: any) => <>{children}</>,
            h1: ({ node, ...props }: any) => <h1 {...props} className="text-2xl font-bold mb-4 mt-6 pb-2 border-b border-gray-200 dark:border-slate-700 text-[#E30613] dark:text-[#E30613]" />,
            h2: ({ node, ...props }: any) => <h2 {...props} className="text-xl font-bold mb-3 mt-5 text-gray-900 dark:text-white flex items-center gap-2" />,
            h3: ({ node, ...props }: any) => <h3 {...props} className="text-lg font-bold mb-2 mt-4 text-gray-800 dark:text-gray-200" />,
            ul: ({ node, ...props }: any) => <ul {...props} className="list-disc pl-5 my-3 space-y-1" />,
            ol: ({ node, ...props }: any) => <ol {...props} className="list-decimal pl-5 my-3 space-y-1" />,
            li: CustomTextRenderer,
            p: CustomTextRenderer,
            table: ({ node, ...props }: any) => <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm"><table {...props} className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900" /></div>,
            thead: ({ node, ...props }: any) => <thead {...props} className="bg-gray-50 dark:bg-slate-800" />,
            th: ({ node, ...props }: any) => <th {...props} className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider" />,
            tr: ({ node, ...props }: any) => <tr {...props} className="even:bg-gray-50/50 dark:even:bg-slate-800/50" />,
            td: ({ node, ...props }: any) => <td {...props} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap border-t border-gray-200 dark:border-slate-700" />,
            a: ({ node, ...props }: any) => <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline font-medium" target="_blank" rel="noopener noreferrer" />,
        };
    }, [isTyping]);

    // Zen Canvas Layout
    if (isUser) {
        return (
            <div className="flex w-full justify-end mb-6">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#E30613] text-white px-5 py-3 shadow-md">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed font-medium">
                        {content}
                    </div>
                </div>
            </div>
        );
    }

    // Assistant Layout (Document Style with Avatar)
    return (
        <div className="flex w-full gap-4 mb-8">
            {/* Avatar Column */}
            <div className="pt-1 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 border border-white dark:border-slate-600 shadow-sm flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#E30613]">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                </div>
            </div>

            {/* Content Column */}
            <div className="flex-1 min-w-0 overflow-hidden">
                {/* Name (Optional, good for identifying) */}
                <div className="text-xs font-bold text-gray-900 dark:text-white mb-1.5 ml-1">AI Asistent</div>

                <div className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 prose prose-slate dark:prose-invert max-w-none prose-p:mb-4 prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white prose-li:my-1 prose-img:rounded-xl">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                    >
                        {displayedContent}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
});

export default AiMessageBubble;
