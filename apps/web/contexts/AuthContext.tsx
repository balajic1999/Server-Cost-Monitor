"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import { login as apiLogin, register as apiRegister, getMe, AuthResponse } from "../lib/api";

interface User {
    id: string;
    email: string;
    name: string;
    createdAt?: string;
}

interface AuthCtx {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

const TOKEN_KEY = "cloudpulse_token";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Hydrate from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(TOKEN_KEY);
        if (!stored) {
            setLoading(false);
            return;
        }
        getMe(stored)
            .then((u) => {
                setUser(u);
                setToken(stored);
            })
            .catch(() => localStorage.removeItem(TOKEN_KEY))
            .finally(() => setLoading(false));
    }, []);

    const handleAuth = useCallback((res: AuthResponse) => {
        localStorage.setItem(TOKEN_KEY, res.token);
        setToken(res.token);
        setUser(res.user);
    }, []);

    const login = useCallback(
        async (email: string, password: string) => {
            const res = await apiLogin({ email, password });
            handleAuth(res);
        },
        [handleAuth]
    );

    const register = useCallback(
        async (email: string, password: string, name: string) => {
            const res = await apiRegister({ email, password, name });
            handleAuth(res);
        },
        [handleAuth]
    );

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
