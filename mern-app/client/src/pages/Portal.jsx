import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, ShieldCheck, Building2 } from 'lucide-react';

const PortalCard = ({ icon: Icon, iconColor, iconBg, title, description, onClick }) => (
    <div
        className="apple-card"
        onClick={onClick}
        style={{ cursor: 'pointer', padding: '40px 32px', textAlign: 'center', userSelect: 'none' }}
    >
        <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: iconBg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 24px'
        }}>
            <Icon size={30} color={iconColor} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{title}</h2>
        <p style={{ fontSize: '14px', color: 'var(--secondary)', lineHeight: 1.5 }}>{description}</p>
        <button className="btn btn-primary" style={{ marginTop: '24px', width: '100%', padding: '12px' }}>
            Continue →
        </button>
    </div>
);

export const Portal = () => {
    const navigate = useNavigate();

    return (
        <div className="auth-page" style={{ flexDirection: 'column', gap: '48px', alignItems: 'center' }}>
            {/* Brand Header */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '44px', height: '44px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={24} color="white" />
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>Uni TT Gen</span>
                </div>
                <p className="page-eyebrow">Academic Precision Suite</p>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 700, letterSpacing: '-0.03em', marginTop: '4px' }}>Select Your Portal</h1>
                <p style={{ fontSize: '15px', color: 'var(--secondary)', marginTop: '8px' }}>
                    University Timetable Generator — Precision-built for academic institutions
                </p>
            </div>

            {/* Portal Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', width: '100%', maxWidth: '900px' }}>
                <PortalCard
                    icon={ShieldCheck}
                    iconColor="var(--primary)"
                    iconBg="var(--primary-bg)"
                    title="Administration"
                    description="Manage timetables, infrastructure, courses, and user accounts."
                    onClick={() => navigate('/login/admin')}
                />
                <PortalCard
                    icon={BookOpen}
                    iconColor="#ff9500"
                    iconBg="rgba(255,149,0,0.1)"
                    title="Faculty"
                    description="View your personalized teaching schedule and manage availability."
                    onClick={() => navigate('/login/prof')}
                />
                <PortalCard
                    icon={GraduationCap}
                    iconColor="#34c759"
                    iconBg="rgba(52,199,89,0.1)"
                    title="Student"
                    description="Access your section's class schedule at a glance."
                    onClick={() => navigate('/login/student')}
                />
            </div>
        </div>
    );
};
