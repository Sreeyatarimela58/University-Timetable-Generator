import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ShieldCheck, BookOpen, GraduationCap } from 'lucide-react';
import api from '../api/client';

const roleConfig = {
    admin:   { label: 'Administrator',  icon: ShieldCheck,    color: 'var(--primary)',  bg: 'var(--primary-bg)' },
    prof:    { label: 'Faculty',         icon: BookOpen,       color: '#ff9500',         bg: 'rgba(255,149,0,0.1)' },
    student: { label: 'Student',         icon: GraduationCap,  color: '#34c759',         bg: 'rgba(52,199,89,0.1)' },
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
        <div className="auth-page">
            <div className="auth-card">
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={18} color="white" />
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>Uni TT Gen</p>
                        <p style={{ fontSize: '10px', color: 'var(--secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Precision Suite</p>
                    </div>
                </div>

                {/* Role Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={config.color} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>{config.label} Sign In</h2>
                        <p style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '2px' }}>Enter your credentials to continue</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="input-group">
                        <label className="input-label">Username</label>
                        <input
                            className="input-field"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <input
                            className="input-field"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', padding: '14px', marginTop: '8px', fontSize: '14px', borderRadius: '14px' }}
                    >
                        {loading ? 'Authenticating…' : 'Secure Sign In'}
                    </button>
                </form>

                {/* Hint for admin */}
                {role === 'admin' && (
                    <p style={{ textAlign: 'center', color: 'var(--secondary)', fontSize: '12px', marginTop: '20px', lineHeight: 1.5 }}>
                        Default seed: <strong>admin / password123</strong>
                    </p>
                )}

                {/* Back link */}
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <Link to="/" style={{ fontSize: '13px', color: 'var(--secondary)', textDecoration: 'none', fontWeight: 500 }}>
                        ← Back to Portal
                    </Link>
                </div>
            </div>
        </div>
    );
};
