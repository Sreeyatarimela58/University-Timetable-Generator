import React from 'react';
import './TimetableGrid.css';

const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
const dayLabels = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday' };
const slots = [1, 2, 3, 4, 5, 6, 7, 8];
const timeLabels = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

/**
 * PreviewGrid renders a draft timetable array.
 * Now supports Unified course display with Theory/Lab components.
 */
export const PreviewGrid = ({ timetable = [], title = 'Draft Preview' }) => {
    const findEntry = (day, slot) => timetable.find(e => e.day === day && e.slot === slot);

    const renderCell = (day, slot) => {
        // Implicit Lunch: slots 4 & 5
        if (slot === 4 || slot === 5) {
            const entry = findEntry(day, slot);
            if (!entry) {
                return <div className="grid-cell lunch-cell">LUNCH</div>;
            }
        }

        const entry = findEntry(day, slot);
        if (entry) {
            const isLab = entry.component === 'lab';
            return (
                <div className={`grid-cell filled-cell ${isLab ? 'lab-cell' : 'theory-cell'}`}>
                    <span className="cell-course">
                        {entry.courseName} {isLab ? '(Lab)' : ''}
                    </span>
                    <span className="cell-teacher">{entry.teacherName}</span>
                    <span className="cell-meta">{entry.roomName}</span>
                </div>
            );
        }
        return <div className="grid-cell empty-cell">—</div>;
    };

    return (
        <div className="preview-container">
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{title}</h3>
            <div className="timetable-grid">
                {/* Header Row */}
                <div className="grid-header corner-cell">Time</div>
                {days.map(d => (
                    <div key={d} className="grid-header">{dayLabels[d]}</div>
                ))}

                {/* Body Rows */}
                {slots.map((slot, idx) => (
                    <React.Fragment key={slot}>
                        <div className="grid-header time-cell">{timeLabels[idx]}</div>
                        {days.map(day => (
                            <React.Fragment key={`${day}-${slot}`}>
                                {renderCell(day, slot)}
                            </React.Fragment>
                        ))}
                    </React.Fragment>
                ))}
            </div>
            
            <div className="grid-legend" style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', background: 'rgba(96, 165, 250, 0.2)', border: '1px solid #60a5fa' }}></div>
                    <span>Theory</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', background: 'rgba(248, 113, 113, 0.2)', border: '1px solid #f87171' }}></div>
                    <span>Laboratory</span>
                </div>
            </div>
        </div>
    );
};
