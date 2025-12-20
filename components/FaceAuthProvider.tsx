'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import FaceAuthContext from '@/context/FaceAuthContext';
import FaceAuthModal from '@/components/FaceAuthModal';

export default function FaceAuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userImage, setUserImage] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check local storage on mount
        const savedImage = localStorage.getItem('sebit_user_face');
        const savedName = localStorage.getItem('sebit_user_name');

        if (savedImage || savedName) {
            if (savedImage) setUserImage(savedImage);
            if (savedName) setUserName(savedName);
            setIsAuthenticated(true);
        }
        setIsChecking(false);
    }, []);

    const authenticate = (image: string) => {
        localStorage.setItem('sebit_user_face', image);
        setUserImage(image);
        setIsAuthenticated(true);
        router.push('/dashboard?tab=firma');
    };

    const authenticateByName = (name: string) => {
        localStorage.setItem('sebit_user_name', name);
        setUserName(name);
        setIsAuthenticated(true);

        if (name === 'Honza Horyna' || name === 'Zdeněk Horyna') {
            router.push('/dashboard?tab=firma');
        } else {
            router.push('/vykazy');
        }
    };

    const clearAuth = () => {
        localStorage.removeItem('sebit_user_face');
        localStorage.removeItem('sebit_user_name');
        setUserImage(null);
        setUserName(null);
        setIsAuthenticated(false);
    };

    if (isChecking) {
        return null; // Or a loading spinner
    }

    return (
        <FaceAuthContext.Provider value={{ isAuthenticated, userImage, userName, authenticate, authenticateByName, clearAuth }}>
            {children}
            {!isAuthenticated && <FaceAuthModal onCapture={authenticate} onNameSelect={authenticateByName} />}
        </FaceAuthContext.Provider>
    );
}
