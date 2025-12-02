import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from './shared';

export const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (login(email, password)) {
            navigate('/');
        } else {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <img src="/keeta-logo.png" alt="Keeta Logo" className="w-28 h-28 mx-auto mb-6 rounded-3xl shadow-glow" />
                    <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
                    <p className="text-slate-500">Sign in to Keeta GCC Training Scorecard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email</label>
                        <input
                            type="email"
                            className="input-field"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@keeta.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
                        <input
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="•••••"
                            required
                        />
                    </div>

                    {error && <div className="text-red-500 text-sm font-medium text-center">{error}</div>}

                    <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        fullWidth
                        leftIcon={<Lock size={18} />}
                    >
                        Sign In
                    </Button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-400">
                    Default: amrmelegy@keetainc.com / KeetaStart1!
                </div>        </div>
        </div>
    );
};
