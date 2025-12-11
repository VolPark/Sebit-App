'use client';

import { useState, useEffect, ReactNode } from 'react';
import FaceAuthContext from '@/context/FaceAuthContext';
import FaceAuthModal from '@/components/FaceAuthModal';

export default function FaceAuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userImage, setUserImage] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check local storage on mount
        const savedImage = localStorage.getItem('sebit_user_face');
        if (savedImage) {
            setUserImage(savedImage);
            setIsAuthenticated(true);
        }
        setIsChecking(false);
    }, []);

    const authenticate = (image: string) => {
        localStorage.setItem('sebit_user_face', image);
        setUserImage(image);
        setIsAuthenticated(true);
    };

    const clearAuth = () => {
        localStorage.removeItem('sebit_user_face');
        setUserImage(null);
        setIsAuthenticated(false);
    };

    if (isChecking) {
        return null; // Or a loading spinner
    }

    return (
        <FaceAuthContext.Provider value={{ isAuthenticated, userImage, authenticate, clearAuth }}>
            {children}
            {!isAuthenticated && <FaceAuthModal onCapture={authenticate} />}
        </FaceAuthContext.Provider>
    );
}
