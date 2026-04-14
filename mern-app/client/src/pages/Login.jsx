import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export const Login = () => {
    const { role } = useParams(); // 'admin', 'prof', or 'student'
    const { login } = useAuth();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/login', { username, password, role });
            login(res.data);
        } catch(err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
                <h2 style={{ textAlign: 'center', textTransform: 'capitalize', marginBottom: '2rem' }}>
                    {role} Login
                </h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <input 
                            type="text" 
                            className="input-field" 
                            placeholder="Username" 
                            value={username} onChange={e => setUsername(e.target.value)} required 
                        />
                    </div>
                    <div>
                        <input 
                            type="password" 
                            className="input-field" 
                            placeholder="Password" 
                            value={password} onChange={e => setPassword(e.target.value)} required 
                        />
                    </div>
                    
                    {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}
                    
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Authenticating...' : 'Secure Access'}
                    </button>
                    
                    {role === 'admin' && (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
                            Default credential seed: admin / password123
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};
