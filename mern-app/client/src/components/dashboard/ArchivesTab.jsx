import React from 'react';
import { Archive, History, Filter } from 'lucide-react';

export const ArchivesTab = () => {
    return (
        <div className="animate-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <div>
                    <p className="page-eyebrow">Academic Records</p>
                    <h2 className="page-title">Schedules Archive</h2>
                    <p className="page-subtitle">Historical timetables and historical generation logs.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={14} /> Filter History
                    </button>
                    <button className="btn btn-primary">Download All</button>
                </div>
            </div>

            {/* Empty State */}
            <div className="apple-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                <div style={{ 
                    width: '80px', height: '80px', background: 'var(--surface-low)', 
                    borderRadius: '24px', display: 'flex', alignItems: 'center', 
                    justifyContent: 'center', margin: '0 auto 24px' 
                }}>
                    <Archive size={32} color="var(--secondary)" />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>No Archived Records</h3>
                <p style={{ color: 'var(--secondary)', fontSize: '15px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
                    Once you generate and publish a timetable, it will be stored here for future reference and academic auditing.
                </p>
                
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--on-surface)' }}>0</p>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Published</p>
                    </div>
                    <div style={{ width: '1px', background: 'var(--outline)' }} />
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--on-surface)' }}>0</p>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Versions</p>
                    </div>
                </div>
            </div>

            {/* Placeholder List */}
            <div style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <History size={18} color="var(--secondary)" />
                    <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Recent Versions</h4>
                </div>
                <div style={{ border: '1px dashed var(--outline)', borderRadius: '16px', padding: '24px', textAlign: 'center', color: 'var(--secondary)', fontSize: '13px' }}>
                    Past versions will appear here after the first publish.
                </div>
            </div>
        </div>
    );
};
