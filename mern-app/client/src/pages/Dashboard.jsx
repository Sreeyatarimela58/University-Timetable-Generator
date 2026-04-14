import React, { useState } from 'react';
import api from '../api/client';
import { Play, Settings2, Database } from 'lucide-react';

export const Dashboard = () => {
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        setGenerating(true);
        setMessage('');
        setError('');
        try {
            const res = await api.post('/generate');
            setMessage(`Success! ${res.data.message}`);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Control Panel */}
            <div className="glass-panel">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings2 color="var(--brand-primary)" />
                    System Controls
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Trigger the Prolog constraint solver to ingest the database mappings and resolve mathematically optimal timetable combinations. 
                </p>

                <button 
                    className="btn btn-primary" 
                    onClick={handleGenerate} 
                    disabled={generating}
                    style={{ width: '100%', justifyContent: 'center' }}
                >
                    <Play size={18} />
                    {generating ? 'Solving Combinations (Timeout: 5.0s)...' : 'Generate Master Timetable'}
                </button>

                {message && <div style={{ marginTop: '1rem', color: 'var(--success)', padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px' }}>{message}</div>}
                {error && <div style={{ marginTop: '1rem', color: 'var(--danger)', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>{error}</div>}
            </div>

            {/* Quick Data View Placeholder */}
            <div className="glass-panel">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Database color="var(--brand-primary)" />
                    Data Health
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px' }}>
                        <span>Teachers</span>
                        <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>Ready</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px' }}>
                        <span>Rooms</span>
                        <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>Ready</span>
                    </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '8px' }}>
                        <span>Courses & Sections</span>
                        <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>Ready</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
