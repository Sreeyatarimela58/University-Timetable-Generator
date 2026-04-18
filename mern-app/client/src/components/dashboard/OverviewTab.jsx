import React, { useState, useEffect } from 'react';
import { Database, School, BookOpen, DoorOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';

const StatCard = ({ icon: Icon, label, value, badge, note, iconBg, iconColor }) => (
    <div className="stat-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div className="stat-icon" style={{ background: iconBg || 'var(--primary-bg)' }}>
                <Icon size={20} color={iconColor || 'var(--primary)'} />
            </div>
            {badge && (
                <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                    borderRadius: '20px', background: 'rgba(52,199,89,0.08)',
                    color: '#1a9e3f', border: '1px solid rgba(52,199,89,0.15)'
                }}>
                    {badge}
                </span>
            )}
        </div>
        <p className="stat-label">{label}</p>
        <h3 className="stat-value">{value}</h3>
        {note && (
            <div style={{ borderTop: '1px solid var(--outline)', marginTop: '16px', paddingTop: '12px' }}>
                <p style={{ fontSize: '11px', color: 'var(--secondary)', fontStyle: 'italic' }}>{note}</p>
            </div>
        )}
    </div>
);

export const OverviewTab = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ programs: '—', courses: '—', rooms: '—' });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/stats');
                setStats({
                    programs: res.data.programs,
                    courses: res.data.courses,
                    rooms: res.data.rooms
                });
            } catch (err) {
                console.error("Failed to load overview stats:", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="animate-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <div>
                    <p className="page-eyebrow">Administrative Intelligence</p>
                    <h2 className="page-title">University Overview</h2>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary">Export Report</button>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/infrastructure')}>New Program</button>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '40px' }}>
                <StatCard
                    icon={School}
                    label="Total Programs"
                    value={stats.programs}
                    badge="Active"
                    note="Manage through Infrastructure"
                    iconBg="var(--primary-bg)"
                    iconColor="var(--primary)"
                />
                <StatCard
                    icon={BookOpen}
                    label="Active Courses"
                    value={stats.courses}
                    badge="Steady"
                    note="Curriculum counts"
                    iconBg="rgba(255,149,0,0.08)"
                    iconColor="#ff9500"
                />
                <StatCard
                    icon={DoorOpen}
                    label="Physical Rooms"
                    value={stats.rooms}
                    badge="Ready"
                    note="Infrastructure capacity"
                    iconBg="rgba(0,122,255,0.08)"
                    iconColor="#007aff"
                />
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '4fr 3fr', gap: '32px' }}>
                {/* Schedule Preview */}
                <div className="apple-card" style={{ padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Fluid Schedule</h3>
                        <div style={{ display: 'flex', background: 'var(--surface-low)', borderRadius: '10px', padding: '3px', border: '1px solid var(--outline)' }}>
                            <button style={{ padding: '6px 16px', fontSize: '11px', fontWeight: 700, background: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-xs)' }}>Week</button>
                            <button style={{ padding: '6px 16px', fontSize: '11px', fontWeight: 700, background: 'transparent', color: 'var(--secondary)', border: 'none', cursor: 'pointer' }}>Month</button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                            <div key={day} style={{ flex: 1, textAlign: 'center' }}>
                                <p style={{ fontSize: '10px', fontWeight: 700, color: i === 1 ? 'var(--primary)' : 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px' }}>{day}</p>
                                <div style={{ background: 'var(--surface-low)', border: '1px solid var(--outline)', borderRadius: '12px', padding: '10px', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <p style={{ fontSize: '9px', color: 'var(--secondary)', fontWeight: 700 }}>Generate to view</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Activity */}
                    <div className="apple-card" style={{ padding: '24px', flex: 1 }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '20px' }}>Recent Activity</h3>
                        {[
                            { label: 'System Ready', sub: 'All services online' },
                            { label: 'Define Programs', sub: 'Start in Infrastructure tab' },
                            { label: 'Add Rooms & Sections', sub: 'Then create assignments' },
                        ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: '14px', marginBottom: i < 2 ? '20px' : 0, opacity: i > 0 ? 0.7 : 1 }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--surface-low)', border: '1px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Database size={16} color="var(--secondary)" />
                                </div>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: 700 }}>{item.label}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--secondary)', marginTop: '2px' }}>{item.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Curator AI Card */}
                    <div style={{
                        background: 'var(--primary)', borderRadius: '16px', padding: '24px',
                        color: 'white', boxShadow: '0 8px 24px rgba(0,102,204,0.2)', position: 'relative', overflow: 'hidden'
                    }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '10px', position: 'relative', zIndex: 1 }}>Intelligence Engine</h4>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                            Configure your academic infrastructure to enable AI-powered timetable optimization.
                        </p>
                        <button
                            style={{ background: 'white', color: 'var(--primary)', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', position: 'relative', zIndex: 1 }}
                            onClick={() => navigate('/admin/solver')}
                        >
                            Activate Solver
                        </button>
                        <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', width: '100px', height: '100px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};
