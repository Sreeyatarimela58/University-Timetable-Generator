import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';

export const Portal = () => {
    const navigate = useNavigate();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '2rem' }}>
            <h1 style={{ marginBottom: '1rem', textAlign: 'center' }}>Select Your Portal</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1000px' }}>
                
                {/* Admin Card */}
                <div onClick={() => navigate('/login/admin')} className="glass-panel" style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', padding: '3rem 2rem' }}>
                    <ShieldCheck size={48} color="var(--brand-primary)" style={{ margin: '0 auto 1rem auto' }} />
                    <h2 style={{ margin: '0' }}>Administration</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Timetable generation & user management</p>
                </div>

                {/* Professor Card */}
                <div onClick={() => navigate('/login/prof')} className="glass-panel" style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', padding: '3rem 2rem' }}>
                    <BookOpen size={48} color="var(--warning)" style={{ margin: '0 auto 1rem auto' }} />
                    <h2 style={{ margin: '0' }}>Faculty</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>View personalized teaching schedules</p>
                </div>

                {/* Student Card */}
                <div onClick={() => navigate('/login/student')} className="glass-panel" style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', padding: '3rem 2rem' }}>
                    <GraduationCap size={48} color="var(--success)" style={{ margin: '0 auto 1rem auto' }} />
                    <h2 style={{ margin: '0' }}>Student</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Access isolated section layouts</p>
                </div>

            </div>
        </div>
    );
};
