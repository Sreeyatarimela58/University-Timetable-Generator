import React from 'react';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const TIME_LABELS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const COMPONENT_COLORS = {
    theory: { badge: 'var(--primary)', bg: 'rgba(0,102,204,0.04)' },
    lab:    { badge: '#ff9500',        bg: 'rgba(255,149,0,0.04)' }
};

export const PreviewGrid = ({ timetable = [], title = 'Draft Preview' }) => {
    const findEntry = (day, slot) => timetable.find(e => e.day === day && e.slot === slot);

    const renderCell = (day, slot) => {
        // Implicit Lunch: slots 4 & 5
        if (slot === 4 || slot === 5) {
            const entry = findEntry(day, slot);
            if (!entry) {
                return (
                    <div className="tt-cell" key={`${day}-${slot}`}>
                        <div className="tt-cell-lunch">
                            <span>Lunch</span>
                        </div>
                    </div>
                );
            }
        }

        const entry = findEntry(day, slot);
        if (entry) {
            const isLab = entry.component === 'lab';
            const color = isLab ? COMPONENT_COLORS.lab : COMPONENT_COLORS.theory;
            
            return (
                <div className="tt-cell" key={`${day}-${slot}`} style={{ background: color.bg }}>
                    <div className="tt-cell-inner" style={{ border: `1px solid ${color.badge}22`, padding: '8px 10px' }}>
                        <p className="tt-cell-code" style={{ color: color.badge, fontSize: '9px' }}>
                            {isLab ? 'LAB' : 'THEORY'}
                        </p>
                        <p className="tt-cell-name" style={{ fontSize: '11px' }}>{entry.courseName}</p>
                        <div className="tt-cell-meta" style={{ marginTop: '4px', fontSize: '9px' }}>
                            <p style={{ fontWeight: 600 }}>{entry.teacherName}</p>
                            <p style={{ opacity: 0.7 }}>{entry.roomName}</p>
                        </div>
                    </div>
                </div>
            );
        }
        return <div className="tt-cell tt-empty" key={`${day}-${slot}`} />;
    };

    return (
        <div className="preview-container animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{title}</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--primary)' }}></div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--secondary)' }}>Theory</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#ff9500' }}></div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--secondary)' }}>Lab</span>
                    </div>
                </div>
            </div>

            <div className="tt-wrapper" style={{ borderRadius: '16px' }}>
                <div className="tt-header-row">
                    <div className="tt-time" style={{ border: 'none', background: 'transparent' }} />
                    {DAY_LABELS.map(d => (
                        <div key={d} className="tt-day-header" style={{ padding: '10px 4px', fontSize: '9px' }}>{d}</div>
                    ))}
                </div>

                <div className="tt-body" style={{ maxHieght: '400px' }}>
                    {SLOTS.map((slot, idx) => (
                        <div key={slot} className="tt-row">
                            <div className="tt-time" style={{ padding: '4px', fontSize: '9px' }}>{TIME_LABELS[idx]}</div>
                            {DAYS.map(day => renderCell(day, slot))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
