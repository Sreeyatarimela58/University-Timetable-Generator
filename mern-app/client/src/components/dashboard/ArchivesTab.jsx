import React, { useState, useEffect, useMemo } from 'react';
import { Archive, Filter } from 'lucide-react';
import api from '../../api/client';
import { PreviewGrid } from '../PreviewGrid';
import '../dashboard/SolverTab.css'; // Leverage existing st-select styles

export const ArchivesTab = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [programs, setPrograms] = useState([]);
    const [years, setYears] = useState([]);
    const [timetables, setTimetables] = useState([]);
    
    const [viewProgram, setViewProgram] = useState('');
    const [viewYear, setViewYear] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [progRes, yearRes, ttRes] = await Promise.all([
                    api.get('/programs'),
                    api.get('/academicyears'),
                    api.get('/timetables') // Active/Current timetables
                ]);
                setPrograms(progRes.data);
                setYears(yearRes.data);
                
                // Format timetable to match PreviewGrid expectations
                const formatted = ttRes.data.map(t => ({
                    sectionId: t.sectionId?._id || t.sectionId,
                    sectionName: t.sectionId?.name || 'Unknown',
                    programId: t.programId,
                    yearId: t.yearId,
                    courseId: t.courseId?._id || t.courseId,
                    courseName: t.courseId?.name || 'Unknown',
                    teacherId: t.teacherId?._id || t.teacherId,
                    teacherName: t.teacherId?.name || 'Unknown',
                    roomId: t.roomId?._id || t.roomId,
                    roomName: t.roomId?.name || 'Unknown',
                    day: t.day,
                    slot: t.slot,
                    component: t.component,
                    status: 1
                }));
                setTimetables(formatted);
            } catch (err) {
                console.error("Failed to fetch archives data:", err);
                setError('Failed to load published timetables.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const programMap = useMemo(() => {
        const map = {};
        programs.forEach(p => map[p._id] = p.name);
        return map;
    }, [programs]);

    const yearMap = useMemo(() => {
        const map = {};
        years.forEach(y => map[y._id] = y.yearNumber);
        return map;
    }, [years]);

    // Only active (current) non-archived logically, though api.get('/timetables') gets all by default.
    // If you implemented true archiving logic, you could filter t => !t.isArchived here, but we will show everything for the current selection.
    
    const groupedData = useMemo(() => {
        const grouped = {};
        timetables.forEach(item => {
            const { programId, yearId } = item;
            if (!grouped[programId]) grouped[programId] = {};
            if (!grouped[programId][yearId]) grouped[programId][yearId] = [];
            grouped[programId][yearId].push(item);
        });
        return grouped;
    }, [timetables]);

    // Auto-select first available program and year with data
    useEffect(() => {
        const progIds = Object.keys(groupedData);
        if (progIds.length > 0 && (!viewProgram || !groupedData[viewProgram])) {
            setViewProgram(progIds[0]);
        }
    }, [groupedData, viewProgram]);

    useEffect(() => {
        if (viewProgram && groupedData[viewProgram]) {
            const yearIds = Object.keys(groupedData[viewProgram]);
            if (yearIds.length > 0 && (!viewYear || !groupedData[viewProgram][viewYear])) {
                setViewYear(yearIds[0]);
            }
        }
    }, [groupedData, viewProgram, viewYear]);

    const activeEntries = (viewProgram && viewYear && groupedData[viewProgram]?.[viewYear]) 
        ? groupedData[viewProgram][viewYear] 
        : [];
        
    const uniquePublishedSectionsCount = useMemo(() => {
        const uniqueSections = new Set(timetables.map(t => t.sectionId));
        return uniqueSections.size;
    }, [timetables]);

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Archived Schedules...</div>;
    }

    return (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <p className="page-eyebrow">Academic Records</p>
                    <h2 className="page-title">Published Timetables</h2>
                    <p className="page-subtitle">Currently active and published schedules.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="st-status-pill st-status-active" style={{ fontSize: '11px', padding: '6px 12px' }}>
                        {uniquePublishedSectionsCount} Sections Published
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ padding: '16px', backgroundColor: 'var(--error-container, #ffdad6)', color: 'var(--on-error-container, #93000a)', borderRadius: '12px', marginBottom: '24px' }}>
                    {error}
                </div>
            )}

            {Object.keys(groupedData).length === 0 ? (
                /* Empty State */
                <div className="apple-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                    <div style={{ 
                        width: '80px', height: '80px', background: 'var(--surface-low)', 
                        borderRadius: '24px', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', margin: '0 auto 24px' 
                    }}>
                        <Archive size={32} color="var(--secondary)" />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>No Published Records</h3>
                    <p style={{ color: 'var(--secondary)', fontSize: '15px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
                        Once you finalize and publish a timetable in the Solver, it will appear here.
                    </p>
                </div>
            ) : (
                /* Data Viewer */
                <div className="apple-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflow: 'hidden' }}>
                    
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--outline)' }}>
                        <div className="st-select-wrapper">
                            <select 
                                value={viewProgram} 
                                onChange={e => { setViewProgram(e.target.value); setViewYear(''); }} 
                                className="st-select" 
                                style={{ minWidth: '200px' }}
                            >
                                <option value="" disabled>Select Program</option>
                                {Object.keys(groupedData).map(pid => (
                                    <option key={pid} value={pid}>{programMap[pid] || pid}</option>
                                ))}
                            </select>
                            <span className="st-select-arrow" style={{ right: '12px', top: '50%', transform: 'translateY(-50%)' }}>▾</span>
                        </div>
                        <div className="st-select-wrapper">
                            <select 
                                value={viewYear} 
                                onChange={e => setViewYear(e.target.value)} 
                                className="st-select" 
                                disabled={!viewProgram} 
                                style={{ minWidth: '150px' }}
                            >
                                <option value="" disabled>Select Year</option>
                                {viewProgram && Object.keys(groupedData[viewProgram] || {}).map(yid => (
                                    <option key={yid} value={yid}>Year {yearMap[yid] || yid}</option>
                                ))}
                            </select>
                            <span className="st-select-arrow" style={{ right: '12px', top: '50%', transform: 'translateY(-50%)' }}>▾</span>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--surface-lowest)', borderRadius: '12px', border: '1px solid var(--outline-variant)' }}>
                        {activeEntries.length > 0 ? (
                            <PreviewGrid 
                                timetable={activeEntries} 
                                title={`${programMap[viewProgram] || viewProgram} - Year ${yearMap[viewYear] || viewYear}`} 
                            />
                        ) : (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary)' }}>
                                Select a program and year to view timetables.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
