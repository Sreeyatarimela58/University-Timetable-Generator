import React, { useEffect, useState } from 'react';
import api from '../api/client';
import './TimetableGrid.css';

const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']; // 8 Slots

export const TimetableGrid = ({ sectionId }) => {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate matrix: 5 days col x 8 slots row
  // Actually CSS grid is easier if we map by Row (Slot) then columns (Days)
  
  useEffect(() => {
    // Ideally this queries `/api/timetables?sectionId=...`
    // We fetch all for demo purposes
    api.get('/timetables').then(res => {
      // filters
      const data = sectionId ? res.data.filter(t => t.sectionId === sectionId) : res.data;
      setScheduleData(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    })
  }, [sectionId]);

  if (loading) return <div>Loading Schedule...</div>;

  const renderCell = (day, slotNum) => {
    // Find assignment for this intersection
    const assignment = scheduleData.find(t => t.day === day && t.slot === slotNum);
    
    // Implicit Lunch Implementation (Phase 12 of Contract)
    // If no assignment exists and it's slot 4 or 5, we check if the other lunch slot is taken.
    // The Prolog guarantees exactly one of {4, 5} is free per day for the section.
    if (!assignment && (slotNum === 4 || slotNum === 5)) {
        return (
            <div className="grid-cell lunch-break" key={`${day}-${slotNum}`}>
               LUNCH
            </div>
        );
    }

    if (!assignment) {
        return <div className="grid-cell empty" key={`${day}-${slotNum}`}></div>;
    }

    return (
        <div className="grid-cell occupied" key={`${day}-${slotNum}`}>
            <span className="course-badge">{assignment.courseId.slice(0, 8)}</span>
            <div className="cell-info">
               <strong>Prof. {assignment.teacherId.slice(0, 5)}</strong><br />
               Room: {assignment.roomId.slice(0, 5)}
            </div>
        </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h2>Generated Schedule {sectionId && `(Section ${sectionId})`}</h2>
           <button className="btn btn-primary" onClick={() => window.location.reload()}>Refresh</button>
        </div>

        <div className="timetable-grid">
            {/* Header Row */}
            <div className="grid-header">Time</div>
            {days.map(d => (
                <div key={d} className="grid-header" style={{ textTransform: 'uppercase' }}>{d}</div>
            ))}

            {/* Slots Matrix */}
            {times.map((timeLabel, slotIndex) => {
                const slotNum = slotIndex + 1; // 1-8
                return (
                    <React.Fragment key={`row-${slotNum}`}>
                        <div className="grid-time-label">{timeLabel}</div>
                        {days.map(day => renderCell(day, slotNum))}
                    </React.Fragment>
                )
            })}
        </div>
    </div>
  );
};
