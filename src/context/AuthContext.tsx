import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type Role = 'admin' | 'editor' | 'viewer';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    title?: string;
    password?: string; // In a real app, never store plain text!
}

interface AuthContextType {
    user: User | null;
    users: User[];
    login: (email: string, pass: string) => boolean;
    logout: () => void;
    addUser: (user: Omit<User, 'id'>) => void;
    updateUser: (user: User) => void;
    deleteUser: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ADMIN: User = {
    id: 'admin-1',
    name: 'Amr Melegy',
    email: 'amrmelegy@keetainc.com',
    role: 'admin',
    title: 'GCC Regional Training Manager',
    password: 'KeetaStart1!'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('keeta_current_user');
        return saved ? JSON.parse(saved) : null;
    });

    const [users, setUsers] = useState<User[]>(() => {
        const saved = localStorage.getItem('keeta_users');
        if (saved) {
            let parsed = JSON.parse(saved);

            // Fix: Ensure default admin has the correct title if it's missing
            const adminIndex = parsed.findIndex((u: User) => u.email === 'amrmelegy@keetainc.com');
            if (adminIndex !== -1) {
                if (parsed[adminIndex].title !== DEFAULT_ADMIN.title) {
                    parsed[adminIndex] = { ...parsed[adminIndex], title: DEFAULT_ADMIN.title };
                }
            } else {
                // If admin not found at all, reset
                return [DEFAULT_ADMIN];
            }
            return parsed;
        }
        return [DEFAULT_ADMIN];
    });

    useEffect(() => {
        localStorage.setItem('keeta_users', JSON.stringify(users));
    }, [users]);

    useEffect(() => {
        if (user) {
            localStorage.setItem('keeta_current_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('keeta_current_user');
        }
    }, [user]);

    const login = (email: string, pass: string) => {
        const found = users.find(u => u.email === email && u.password === pass);
        if (found) {
            setUser(found);
            return true;
        }
        return false;
    };

    const logout = () => setUser(null);

    const addUser = (newUser: Omit<User, 'id'>) => {
        setUsers(prev => [...prev, { ...newUser, id: uuidv4() }]);
    };

    const updateUser = (updatedUser: User) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        if (user?.id === updatedUser.id) setUser(updatedUser);
    };

    const deleteUser = (id: string) => {
        setUsers(prev => prev.filter(u => u.id !== id));
    };

    return (
        <AuthContext.Provider value={{ user, users, login, logout, addUser, updateUser, deleteUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
