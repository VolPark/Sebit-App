import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AiMessageBubble({ role, children }: { role: 'user' | 'assistant', children: string }) {
    const isUser = role === 'user';

    // Component for handling code blocks vs inline code
    const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        const content = String(children).trim();
        // Check if content looks like just a financial number (e.g. "1 234 567 CZK" or "100 Kč")
        const isFinancial = /^(?:\d{1,3}(?:\s\d{3})*|\d+)(?:[.,]\d+)?\s*(?:CZK|Kč|€|\$)$/i.test(content);

        if (isFinancial) {
            return (
                <span className="inline-block px-3 py-1 my-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 text-sm font-mono shadow-sm">
                    {children}
                </span>
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
        // Simple heuristic to check for alerts. 
        // ReactMarkdown might split the first line if it thinks [!NOTE] is part of a paragraph.
        // We'll check the recursive children content if possible, or just style purely as blockquote for safety first
        // But to properly support [!IMPORTANT], we need to check the text content.

        // Flatten children to text to find the alert tag
        const findAlert = (nodes: any): string | null => {
            if (typeof nodes === 'string') return nodes;
            if (Array.isArray(nodes)) return nodes.map(findAlert).join('');
            if (nodes?.props?.children) return findAlert(nodes.props.children);
            return '';
        };

        const content = findAlert(children);
        let alertType = null;
        let cleanChildren = children;

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
                        {/* We try to render children, removing the trigger text is hard in react-only without remark plugin, so we just render specific style */}
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
                        <div className="whitespace-pre-wrap">{children}</div>
                    ) : (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code: CodeBlock,
                                blockquote: Blockquote,
                                h1: ({ node, ...props }) => <h1 {...props} className="text-2xl font-bold mb-4 mt-6 pb-2 border-b border-gray-200 dark:border-slate-700 text-[#E30613] dark:text-[#E30613]" />,
                                h2: ({ node, ...props }) => <h2 {...props} className="text-xl font-bold mb-3 mt-5 text-gray-900 dark:text-white flex items-center gap-2" />,
                                h3: ({ node, ...props }) => <h3 {...props} className="text-lg font-bold mb-2 mt-4 text-gray-800 dark:text-gray-200" />,
                                ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-5 my-3 space-y-1" />,
                                ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-5 my-3 space-y-1" />,
                                li: ({ node, ...props }) => <li {...props} className="pl-1" />,
                                p: ({ node, ...props }) => <p {...props} className="mb-3 last:mb-0" />,
                                table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm"><table {...props} className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900" /></div>,
                                thead: ({ node, ...props }) => <thead {...props} className="bg-gray-50 dark:bg-slate-800" />,
                                th: ({ node, ...props }) => <th {...props} className="px-4 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider" />,
                                tr: ({ node, ...props }) => <tr {...props} className="even:bg-gray-50/50 dark:even:bg-slate-800/50" />,
                                td: ({ node, ...props }) => <td {...props} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap border-t border-gray-200 dark:border-slate-700" />,
                                a: ({ node, ...props }) => <a {...props} className="text-blue-600 dark:text-blue-400 hover:underline font-medium" target="_blank" rel="noopener noreferrer" />,
                            }}
                        >
                            {children}
                        </ReactMarkdown>
                    )}
                </div>
            </div>
        </div>
    );
}
