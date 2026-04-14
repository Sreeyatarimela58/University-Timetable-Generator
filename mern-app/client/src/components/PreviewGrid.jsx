import React from 'react';
import './TimetableGrid.css';

const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
const dayLabels = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday' };
const slots = [1, 2, 3, 4, 5, 6, 7, 8];
const timeLabels = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

/**
 * PreviewGrid renders a draft timetable array directly (no API fetch).
 * Used by the admin to inspect a draft before publishing.
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
            return (
                <div className="grid-cell filled-cell">
                    <span className="cell-course">{entry.courseId?.substring(0, 8)}...</span>
                    <span className="cell-meta">R: {entry.roomId?.substring(0, 6)}</span>
                </div>
            );
        }
        return <div className="grid-cell empty-cell">—</div>;
    };

    return (
        <div>
            <h3 style={{ marginBottom: '1rem' }}>{title}</h3>
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
        </div>
    );
};
