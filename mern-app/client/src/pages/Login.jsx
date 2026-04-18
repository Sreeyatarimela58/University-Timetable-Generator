import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, BookOpen, GraduationCap, ArrowLeft, Lock } from 'lucide-react';
import AuthLayout from '../components/layouts/AuthLayout';
import api from '../api/client';

const roleConfig = {
    admin:   { label: 'Administrator',  icon: ShieldCheck,    accent: 'blue' },
    prof:    { label: 'Faculty',         icon: BookOpen,       accent: 'amber' },
    student: { label: 'Student',         icon: GraduationCap,  accent: 'emerald' },
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
            <div className="login-container">
                {/* Back Button */}
                <Link to="/" className="login-back-link">
                    <ArrowLeft size={16} className="login-back-icon" />
                    Back to Portal
                </Link>

                <div className="login-card">
                    {/* Brand */}
                    <div className="login-brand">
                        <div className="login-brand-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                                <path d="M9 22v-4h6v4"></path>
                                <path d="M8 10h.01 M12 10h.01 M16 10h.01 M8 14h.01 M12 14h.01 M16 14h.01"></path>
                            </svg>
                        </div>
                        <div>
                            <p className="login-brand-title">Uni TT Gen</p>
                            <p className="login-brand-subtitle">Precision Suite</p>
                        </div>
                    </div>

                    {/* Role Header */}
                    <div className="login-role-header">
                        <div className="login-role-icon" data-accent={config.accent}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <h2 className="login-role-title">{config.label}</h2>
                            <p className="login-role-subtitle">Secure Authentication Portal</p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="login-field">
                            <label className="login-label">Username</label>
                            <div className="login-input-wrapper">
                                <input
                                    className="login-input"
                                    type="text"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="login-field">
                            <label className="login-label">Password</label>
                            <div className="login-input-wrapper">
                                <input
                                    className="login-input"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                                <Lock size={18} className="login-input-icon" />
                            </div>
                        </div>

                        {error && (
                            <div className="login-error">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="login-submit"
                            disabled={loading}
                        >
                            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                        </button>
                    </form>

                    {/* Hint for admin */}
                    {role === 'admin' && (
                        <div className="login-hint">
                            <p>
                                System Administrator Default: <br/>
                                <span>admin / password123</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AuthLayout>
    );
};
