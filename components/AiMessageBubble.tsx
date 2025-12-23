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

    if (isMermaid) {
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

    if (isTree) {
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

    if (isMath) {
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

    if (progressMatch && (hasExplicitPercentage || hasBlocks)) {
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

    // 1. Progress Bar Check
    // Regex matches: Optional Label + Bar + Percentage (Optional) + Optional Suffix
    // Supports: "Label: [███] 50%", "Label [███] 50% (300h)", "[███] 50%", "[████░░]", "[====] 50%"
    const progressbarRegex = /^(?:(.+?)(?:\||\(|:)\s*)?(?:Vytížení:\s*)?(?:`|\[)?\s*([█░■□=\-#\s]+)(?:`|\])?\s*(?:\|)?\s*(?:(\d+)\s*%)?(?:\s*.*)?$/i;

    // NEW: Supports simple text format: "progress: 6.5 %", "CPU: 90 %"
    const simpleProgressRegex = /^(.+?):\s*(\d+(?:[.,]\d+)?)\s*%$/i;

    const progressMatch = progressbarRegex.exec(content);
    const simpleMatch = simpleProgressRegex.exec(content);

    // Ensure it's actually a progress bar and not just "Label: " matching the loose regex
    // Must either have explicit percentage OR contain block characters
    const hasExplicitPercentage = progressMatch && !!progressMatch[3];
    const hasBlocks = progressMatch && /[█■░□=\-#]/.test(progressMatch[2]);

    // Check if either the complex ASCII bar matches OR the simple text format matches
    if ((progressMatch && (hasExplicitPercentage || hasBlocks)) || simpleMatch) {
        let label = "Vytížení";
        let percentage = 0;

        if (simpleMatch) {
            // Simple format "Label: 50%"
            label = simpleMatch[1].trim();
            // Replace decimal comma with dot for parsing
            percentage = parseFloat(simpleMatch[2].replace(',', '.'));
        } else if (progressMatch) {
            // Complex ASCII format
            // Group 1 is Label (optional), Group 2 is Bar, Group 3 is Percentage
            label = progressMatch[1] ? progressMatch[1].replace(/[:*`\[\]]/g, '').trim() : "Vytížení";

            if (progressMatch[3]) {
                percentage = parseInt(progressMatch[3], 10);
            } else {
                // Auto-calculate if percentage is missing
                const full = (progressMatch[2].match(/[█■=#]/g) || []).length;
                const empty = (progressMatch[2].match(/[░□\-]/g) || []).length;
                const total = full + empty;
                percentage = total > 0 ? Math.round((full / total) * 100) : 0;
            }
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
            <div className="my-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col gap-2">
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
    }

    // 2. Financial Waterfall / Statement Check
    // Pattern: Contains lines with "CZK" and starts with ➖, =, or just text.
    // We look for multiple lines where at least some look like "Symbol ... : ... CZK"
    const lines = content.split('\n').filter(l => l.trim());
    const isWaterfall = lines.length > 2 && lines.some(l => (l.includes('➖') || l.includes('=')) && l.includes('CZK'));

    if (isWaterfall) {
        return (
            <div className="my-5 flex flex-col gap-1">
                {lines.map((line, idx) => {
                    const trimmed = line.trim();
                    // Check if line is a financial row matching "Text: Amount CZK" roughly
                    // It might start with a symbol
                    const isTotal = trimmed.startsWith('=');
                    const isDeduction = trimmed.startsWith('➖');
                    const isPositive = trimmed.startsWith('➕') || /^[^+=\-].*CZK/.test(trimmed); // Default starts with text + CZK

                    // Try to split by colon if it exists and looks like "Label: Value"
                    if (trimmed.includes(':') && trimmed.includes('CZK')) {
                        const [labelRaw, valueRaw] = trimmed.split(/:(.+)/); // Split on first colon
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

                    if (trimmed.length < 50 && !trimmed.includes('.')) {
                        return <h4 key={idx} className="mt-2 mb-1 font-semibold text-gray-800 dark:text-gray-200 text-sm">{line}</h4>
                    }

                    return <p key={idx} className="mb-2 text-gray-600 dark:text-gray-400 italic text-sm">{line}</p>;
                })}
            </div>
        );
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

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
            <div
                className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-4 shadow-sm overflow-hidden ${isUser
                    ? 'bg-[#E30613] text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-slate-700 rounded-bl-none shadow-md'
                    }`}
            >
                <div className={`text-sm leading-relaxed ${isUser ? '' : 'prose prose-sm dark:prose-invert max-w-none prose-p:mb-3 prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white prose-li:my-0.5'}`}>
                    {isUser ? (
                        <div className="whitespace-pre-wrap">{content}</div>
                    ) : (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                        >
                            {displayedContent}
                        </ReactMarkdown>
                    )}
                </div>
            </div>
        </div>
    );
});

export default AiMessageBubble;
