'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface FaceAuthContextType {
    isAuthenticated: boolean;
    userImage: string | null;
    authenticate: (image: string) => void;
    clearAuth: () => void;
}

const FaceAuthContext = createContext<FaceAuthContextType | undefined>(undefined);

export function useFaceAuth() {
    const context = useContext(FaceAuthContext);
    if (context === undefined) {
        throw new Error('useFaceAuth must be used within a FaceAuthProvider');
    }
    return context;
}

export default FaceAuthContext;
