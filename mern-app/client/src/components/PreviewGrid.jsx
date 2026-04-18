import React, { useState, useMemo, useEffect } from 'react';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const TIME_LABELS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const COMPONENT_COLORS = {
    theory: 'theory',
    lab:    'lab'
};

const SectionGrid = ({ timetable = [] }) => {
    const findEntry = (day, slot) => timetable.find(e => e.day === day && e.slot === slot);

    const renderCell = (day, slot) => {
        if (slot === 4 || slot === 5) {
            const entry = findEntry(day, slot);
            if (!entry) {
                return (
                    <div className="tt-cell tt-cell-empty" key={`${day}-${slot}`}>
                        <div className="tt-cell-lunch">Lunch</div>
                    </div>
                );
            }
        }

        const entry = findEntry(day, slot);
        if (entry) {
            if (entry.status === 0) {
                 return <div className="tt-cell tt-cell-unassigned" key={`${day}-${slot}`}>Unassigned</div>;
            }

            const isLab = entry.component === 'lab';
            const typeClass = isLab ? COMPONENT_COLORS.lab : COMPONENT_COLORS.theory;
            
            return (
                <div className="tt-cell" key={`${day}-${slot}`}>
                    <div className={`tt-card ${typeClass}`}>
                        <div className="tt-card-top">
                            <p className="tt-card-type">{isLab ? 'LABORATORY' : 'THEORY'}</p>
                            <p className="tt-card-name">{entry.courseName}</p>
                        </div>
                        <div className="tt-card-bot">
                            <p className="tt-card-meta"><span className="material-symbols-outlined">person</span>{entry.teacherName}</p>
                            <p className="tt-card-meta sub"><span className="material-symbols-outlined">location_on</span>{entry.roomName}</p>
                        </div>
                    </div>
                </div>
            );
        }
        return <div className="tt-cell tt-cell-empty" key={`${day}-${slot}`} />;
    };

    return (
        <div className="tt-master-grid">
            {/* Header Row */}
            <div className="tt-day-header"></div>
            {DAY_LABELS.map(d => (
                <div key={d} className="tt-day-header">{d}</div>
            ))}

            {/* Body Rows */}
            {SLOTS.map((slot, idx) => (
                <React.Fragment key={slot}>
                    <div className="tt-time-slot">
                        {TIME_LABELS[idx]}
                    </div>
                    {DAYS.map(day => renderCell(day, slot))}
                </React.Fragment>
            ))}
        </div>
    );
};

export const PreviewGrid = ({ timetable = [], title = 'Draft Preview' }) => {
    const [activeSectionId, setActiveSectionId] = useState(null);

    const groupedBySection = useMemo(() => {
        return timetable.reduce((acc, entry) => {
            const key = entry.sectionId;
            if (!acc[key]) {
                acc[key] = {
                    name: entry.sectionName || `Section ${key}`,
                    data: []
                };
            }
            acc[key].data.push(entry);
            return acc;
        }, {});
    }, [timetable]);

    const sectionIds = useMemo(() => {
        return Object.keys(groupedBySection).sort();
    }, [groupedBySection]);

    useEffect(() => {
        if (sectionIds.length && (!activeSectionId || !groupedBySection[activeSectionId])) {
            setActiveSectionId(sectionIds[0]);
        }
    }, [sectionIds, activeSectionId, groupedBySection]);

    if (!timetable.length) {
        return (
            <div className="tt-wrapper">
                <div className="tt-header">
                    <h3 className="tt-title">{title}</h3>
                </div>
                <div className="tt-empty-state">No timetable data available.</div>
            </div>
        );
    }

    return (
        <div className="tt-wrapper">
            <div className="tt-header">
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <h3 className="tt-title">{title}</h3>
                    <div className="tt-tabs">
                        {sectionIds.map(sid => (
                            <button
                                key={sid}
                                onClick={() => setActiveSectionId(sid)}
                                className={`tt-tab ${activeSectionId === sid ? 'active' : ''}`}
                            >
                                {groupedBySection[sid].name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="tt-legend">
                    <div className="tt-leg-item">
                        <div className="tt-dot theory"></div>
                        <span className="tt-title" style={{fontSize: '9px'}}>Theory</span>
                    </div>
                    <div className="tt-leg-item">
                        <div className="tt-dot lab"></div>
                        <span className="tt-title" style={{fontSize: '9px'}}>Lab</span>
                    </div>
                </div>
            </div>

            <div className="tt-body">
                {activeSectionId && groupedBySection[activeSectionId] ? (
                    <SectionGrid timetable={groupedBySection[activeSectionId].data} />
                ) : (
                    <div className="tt-empty-state">Select a section to view its timetable.</div>
                )}
            </div>
        </div>
    );
};
