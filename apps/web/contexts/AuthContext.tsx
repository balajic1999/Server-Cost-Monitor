"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from "react";
import {
    login as apiLogin,
    register as apiRegister,
    getMe,
    logoutApi,
    AuthResponse,
} from "../lib/api";

interface User {
    id: string;
    email: string;
    name: string;
    createdAt?: string;
}

interface AuthCtx {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Hydrate session from httpOnly cookie (no localStorage!)
    // Just call getMe — if cookie exists, it'll work; if not, user is null
    useEffect(() => {
        getMe()
            .then((u) => setUser(u))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const handleAuth = useCallback((res: AuthResponse) => {
        // Cookies are set automatically by the browser from Set-Cookie headers
        // We only need the user object from the response body
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

    const logout = useCallback(async () => {
        try {
            await logoutApi();
        } catch {
            // Even if API call fails, clear local state
        }
        setUser(null);
    }, []);

    const refreshUser = useCallback(async () => {
        try {
            const u = await getMe();
            setUser(u);
        } catch {
            setUser(null);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
