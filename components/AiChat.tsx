'use client';

import { useRef, useEffect, useState } from 'react';
import AiMessageBubble from './AiMessageBubble';

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface AiChatProps {
    messages: Message[];
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function AiChat({ messages, setMessages }: AiChatProps) {
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    // Robust scrolling using ResizeObserver & MutationObserver
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        // Handler to enforce scroll if we are supposed to be at the bottom
        const enforceScroll = () => {
            if (shouldAutoScroll) {
                // Use instant scroll for layout shifts (like Mermaid Rendering) to prevent visual jumps
                container.scrollTo({ top: container.scrollHeight, behavior: 'instant' as ScrollBehavior });
            }
        };

        const observer = new ResizeObserver(enforceScroll);
        const mutationObserver = new MutationObserver(enforceScroll);

        // Observe both the container (resize) and its content (mutations/subtree)
        observer.observe(container);
        mutationObserver.observe(container, { childList: true, subtree: true, characterData: true });

        return () => {
            observer.disconnect();
            mutationObserver.disconnect();
        };
    }, [shouldAutoScroll]);

    // Check if we are near the bottom to determine if we should auto-scroll
    const handleScroll = () => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        // If we are within 50px of the bottom, enable auto-scroll
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShouldAutoScroll(isNearBottom);
    };

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        if (shouldAutoScroll && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior });
        }
    };

    // Scroll trigger when messages update (new tokens)
    useEffect(() => {
        scrollToBottom('smooth');
    }, [messages, shouldAutoScroll]);

    // Initial scroll
    useEffect(() => {
        scrollToBottom('auto');
    }, []);

    const handleSendMessage = async (text: string) => {
        const trimmedInput = text.trim();
        if (!trimmedInput || isLoading) return;

        // Force scroll to bottom when sending a new message
        setShouldAutoScroll(true);
        setTimeout(() => scrollToBottom('smooth'), 10);

        // 1. Add User Message
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: trimmedInput,
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            // 2. Fetch API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage], // Send history
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status}): ${errorText.substring(0, 200)}`);
            }
            if (!response.body) throw new Error('No response body');

            // 3. Prepare Assistant Message container
            const assistantMessageId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
            }]);

            // 4. Read Stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let accumulatedContent = '';

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value, { stream: true });
                accumulatedContent += chunkValue;

                // Update the last message (assistant) with accumulated content
                setMessages(prev => prev.map(msg =>
                    msg.id === assistantMessageId
                        ? { ...msg, content: accumulatedContent }
                        : msg
                ));
            }

        } catch (error) {
            console.error("Chat Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Neznámá chyba";
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `⚠️ **Chyba komunikace:** ${errorMessage}. Zkuste to prosím znovu za chvíli.`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper: Verify if the last message is from assistant and has content
    // This allows us to hide the "bouncing dots" if we are already streaming text
    const lastMessage = messages[messages.length - 1];
    const isStreamingResponse = isLoading && lastMessage?.role === 'assistant' && lastMessage.content.length > 0;

    // Show loading ONLY if we are loading AND haven't started streaming content yet
    const showLoadingIndicator = isLoading && !isStreamingResponse;

    return (
        <div className="flex flex-col h-[700px] w-full bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Messages Area */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth"
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#E30613]">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">AI Asistent</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mt-1">
                            Zeptejte se na finance, pracovníky nebo projekty. Mám přístup k vašim datům.
                        </p>
                    </div>
                )}

                {messages.map((m, idx) => (
                    <AiMessageBubble
                        key={m.id}
                        role={m.role === 'user' ? 'user' : 'assistant'}
                        content={m.content}
                        isLast={idx === messages.length - 1}
                        isLoading={isLoading && idx === messages.length - 1}
                    />
                ))}

                {showLoadingIndicator && (
                    <div className="flex justify-start mb-4">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 rounded-bl-none shadow-sm flex gap-1 items-center">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - isolated component */}
            <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        </div>
    );
}

// Optimized input component to prevent re-renders of the main chat list while typing
function ChatInput({ onSend, isLoading }: { onSend: (text: string) => void, isLoading: boolean }) {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSend(input);
        setInput('');
    };

    return (
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
            <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                    className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E30613]/20 focus:border-[#E30613]"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Např.: Jaký byl zisk minulý měsíc?"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={isLoading || !(input || '').trim()}
                    className="px-4 py-2 bg-[#E30613] text-white rounded-xl font-medium hover:bg-[#c40510] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Odeslat
                </button>
            </form>
        </div>
    );
}
