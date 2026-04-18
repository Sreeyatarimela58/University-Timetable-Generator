import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ShieldCheck, BookOpen, GraduationCap, ArrowLeft, Lock } from 'lucide-react';
import AuthLayout from '../components/layouts/AuthLayout';
import api from '../api/client';

const roleConfig = {
    admin:   { label: 'Administrator',  icon: ShieldCheck,    color: '#3b82f6',  bg: 'rgba(59,130,246,0.1)' },
    prof:    { label: 'Faculty',         icon: BookOpen,       color: '#f59e0b',  bg: 'rgba(245,158,11,0.1)' },
    student: { label: 'Student',         icon: GraduationCap,  color: '#10b981',  bg: 'rgba(16,185,129,0.1)' },
};

export const Login = () => {
    const { role } = useParams();
    const { login } = useAuth();
    const config = roleConfig[role] || roleConfig.admin;
    const Icon = config.icon;

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/login', { username, password, role });
            login(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="max-w-md mx-auto">
                {/* Back Button */}
                <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-blue-600 transition-colors mb-8 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Portal
                </Link>

                <div className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-[32px] p-10 shadow-2xl shadow-blue-500/5">
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Building2 size={20} color="white" />
                        </div>
                        <div>
                            <p className="text-base font-black tracking-tight text-slate-800 leading-none">Uni TT Gen</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Precision Suite</p>
                        </div>
                    </div>

                    {/* Role Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ background: config.bg }}
                        >
                            <Icon size={24} color={config.color} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{config.label}</h2>
                            <p className="text-sm text-slate-500">Secure Authentication Portal</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Username</label>
                            <input
                                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
                                type="text"
                                placeholder="Enter username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 ml-1">Password</label>
                            <div className="relative">
                                <input
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <Lock size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-medium text-red-600 animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:pointer-events-none mt-4"
                            disabled={loading}
                        >
                            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                        </button>
                    </form>

                    {/* Hint for admin */}
                    {role === 'admin' && (
                        <div className="mt-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                            <p className="text-center text-[11px] text-blue-600 font-medium leading-relaxed">
                                System Administrator Default: <br/>
                                <span className="font-bold underline">admin / password123</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AuthLayout>
    );
};
