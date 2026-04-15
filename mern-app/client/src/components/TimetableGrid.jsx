import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MapPin, Users, RefreshCw } from 'lucide-react';
import './TimetableGrid.css';

const DAYS  = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

// Color palette per slot index for variety
const SLOT_COLORS = [
  { badge: 'var(--primary)', bg: 'rgba(0,102,204,0.04)' },
  { badge: '#ff9500',        bg: 'rgba(255,149,0,0.04)' },
  { badge: '#5856d6',        bg: 'rgba(88,86,214,0.04)' },
  { badge: '#ff3b30',        bg: 'rgba(255,59,48,0.04)' },
  { badge: '#34c759',        bg: 'rgba(52,199,89,0.04)' },
];

export const TimetableGrid = ({ sectionId }) => {
    const { user } = useAuth();
    const [scheduleData, setScheduleData] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = () => {
        setLoading(true);
        api.get('/timetables').then(res => {
            let data = res.data;
            if (sectionId) {
                data = data.filter(t => t.sectionId === sectionId);
            } else if (user) {
                if (user.role === 'student' && user.sectionId)
                    data = data.filter(t => t.sectionId === user.sectionId);
                else if (user.role === 'prof' && user.profileId)
                    data = data.filter(t => t.teacherId === user.profileId);
            }
            setScheduleData(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [sectionId]);

    const renderCell = (day, slotNum) => {
        const a = scheduleData.find(t => t.day === day && t.slot === slotNum);

        // Lunch break (slot 4 or 5 with no assignment)
        if (!a && (slotNum === 4 || slotNum === 5)) {
            return (
                <div className="tt-cell" key={`${day}-${slotNum}`}>
                    <div className="tt-cell-lunch">
                        <span>Lunch Break</span>
                    </div>
                </div>
            );
        }

        if (!a) {
            return <div className="tt-cell tt-empty" key={`${day}-${slotNum}`} />;
        }

        const color = SLOT_COLORS[slotNum % SLOT_COLORS.length];
        const courseCode = typeof a.courseId === 'object' ? a.courseId?.code : a.courseId?.slice(0, 8) || '—';
        const courseName = typeof a.courseId === 'object' ? a.courseId?.name : '—';
        const teacherName = typeof a.teacherId === 'object' ? a.teacherId?.name : `Prof. ${a.teacherId?.slice(0, 6) || '—'}`;
        const roomName = typeof a.roomId === 'object' ? a.roomId?.name : a.roomId?.slice(0, 6) || '—';

        return (
            <div className="tt-cell" key={`${day}-${slotNum}`} style={{ background: color.bg }}>
                <div className="tt-cell-inner" style={{ border: `1px solid ${color.badge}22` }}>
                    <p className="tt-cell-code" style={{ color: color.badge }}>{courseCode}</p>
                    <p className="tt-cell-name">{courseName || courseCode}</p>
                    <div className="tt-cell-meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <MapPin size={11} />
                            <span>{roomName}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Users size={11} />
                            <span>{teacherName}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-content animate-in">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <p className="page-eyebrow">Master View</p>
                    <h2 className="page-title">
                        {user?.role === 'admin' ? 'Main Campus Timetable' :
                         user?.role === 'prof'  ? 'My Teaching Schedule' :
                         'My Class Schedule'}
                    </h2>
                    <p className="page-subtitle">Generated timetable — Academic Year</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!loading && (
                        <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--outline)', padding: '6px 14px', borderRadius: '20px', gap: '8px', boxShadow: 'var(--shadow-xs)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface)' }}>
                                {scheduleData.length} Scheduled
                            </span>
                        </div>
                    )}
                    <button
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={loadData}
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--secondary)', fontSize: '14px', gap: '12px' }}>
                    <RefreshCw size={18} className="spin" />
                    Loading schedule…
                </div>
            ) : scheduleData.length === 0 ? (
                <div className="apple-card" style={{ padding: '64px 32px', textAlign: 'center' }}>
                    <div style={{ width: '64px', height: '64px', background: 'var(--surface-low)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <Users size={28} color="var(--secondary)" />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No Schedule Published</h3>
                    <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>
                        Generate and publish a timetable from the Admin Dashboard to see it here.
                    </p>
                </div>
            ) : (
                <div className="tt-wrapper">
                    {/* Day Headers */}
                    <div className="tt-header-row">
                        <div className="tt-time" style={{ border: 'none', background: 'transparent' }} />
                        {DAY_LABELS.map(d => (
                            <div key={d} className="tt-day-header">{d}</div>
                        ))}
                    </div>

                    {/* Grid Body */}
                    <div className="tt-body">
                        {TIMES.map((timeLabel, slotIndex) => {
                            const slotNum = slotIndex + 1;
                            return (
                                <div key={slotNum} className="tt-row">
                                    <div className="tt-time">{timeLabel}</div>
                                    {DAYS.map(day => renderCell(day, slotNum))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
