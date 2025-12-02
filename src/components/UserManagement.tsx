import React, { useState } from 'react';
import { useAuth, Role, User } from '../context/AuthContext';
import { Trash2, UserPlus, Shield, Edit2, X, Check } from 'lucide-react';
import clsx from 'clsx';

export const UserManagement: React.FC = () => {
    const { users, addUser, deleteUser, updateUser, user: currentUser } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'viewer' as Role,
        title: '',
        password: ''
    });

    const resetForm = () => {
        setFormData({ name: '', email: '', role: 'viewer', title: '', password: '' });
        setIsAdding(false);
        setEditingUser(null);
    };

    const startEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            role: user.role,
            title: user.title || '',
            password: user.password || ''
        });
        setIsAdding(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            updateUser({ ...editingUser, ...formData });
        } else {
            addUser(formData);
        }
        resetForm();
    };

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900">User Management</h2>
                    <p className="text-slate-500">Manage team access, roles, and profiles.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <UserPlus size={18} />
                        Add User
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 mb-6">
                    <h3 className="font-bold text-lg mb-4">{editingUser ? 'Edit User' : 'New User Details'}</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                            <input
                                className="input-field"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email Address</label>
                            <input
                                className="input-field"
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Job Title</label>
                            <input
                                className="input-field"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Regional Manager"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Role</label>
                            <select
                                className="input-field"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                            >
                                <option value="admin">Admin (Full Access)</option>
                                <option value="editor">Editor (Can Audit)</option>
                                <option value="viewer">Viewer (Read Only)</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Password</label>
                            <input
                                className="input-field"
                                type="text"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required
                                placeholder="Set user password"
                            />
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 flex items-center gap-2">
                                {editingUser ? <Check size={18} /> : <UserPlus size={18} />}
                                {editingUser ? 'Save Changes' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(u => (
                    <div key={u.id} className="card p-6 flex flex-col justify-between group relative">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={clsx(
                                    "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md",
                                    u.role === 'admin' ? "bg-slate-900" : u.role === 'editor' ? "bg-keeta-primary text-slate-900" : "bg-slate-400"
                                )}>
                                    {u.name.charAt(0)}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startEdit(u)}
                                        className="p-2 text-slate-300 hover:text-keeta-primary hover:bg-slate-50 rounded-lg transition-colors"
                                        title="Edit User"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    {u.id !== currentUser?.id && (
                                        <button
                                            onClick={() => deleteUser(u.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <h3 className="font-bold text-lg text-slate-900 leading-tight">{u.name}</h3>
                            <p className="text-xs font-bold text-keeta-primary uppercase tracking-wide mb-1">{u.title || u.role}</p>
                            <p className="text-sm text-slate-500">{u.email}</p>

                            <div className="mt-4 flex items-center gap-2">
                                <span className={clsx(
                                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                                    u.role === 'admin' ? "bg-slate-100 text-slate-600 border-slate-200" :
                                        u.role === 'editor' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                            "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                    {u.role}
                                </span>
                                {u.role === 'admin' && <Shield size={14} className="text-slate-400" />}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
