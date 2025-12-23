import { useState, useEffect } from 'react';

export function useTypewriter(text: string, speed: number = 10, isEnabled: boolean = true) {
    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        // If disabled (or text empty), show everything immediately
        if (!isEnabled || !text) {
            setVisibleCount(text ? text.length : 0);
            return;
        }

        // If we have already shown everything, stop
        if (visibleCount >= text.length) {
            return;
        }

        const timer = setInterval(() => {
            setVisibleCount((current) => {
                if (current < text.length) {
                    const diff = text.length - current;
                    // Adaptive speed: catch up faster if far behind
                    const chunk = diff > 50 ? 5 : diff > 20 ? 2 : 1;
                    return current + chunk;
                }
                return current;
            });
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed, visibleCount, isEnabled]);

    if (!isEnabled) return text;
    return text.substring(0, visibleCount);
}
