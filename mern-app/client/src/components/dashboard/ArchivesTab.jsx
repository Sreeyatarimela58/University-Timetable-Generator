import React, { useState, useEffect, useMemo } from 'react';
import { Archive, ArrowLeft, Edit3, Check, X, Calendar, BookOpen, GraduationCap } from 'lucide-react';
import api from '../../api/client';
import { PreviewGrid } from '../PreviewGrid';
import '../dashboard/SolverTab.css';

export const ArchivesTab = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [viewMode, setViewMode] = useState('LIST'); // 'LIST' or 'DETAIL'
    const [selectedArchive, setSelectedArchive] = useState(null);
    
    const [programs, setPrograms] = useState([]);
    const [years, setYears] = useState([]);
    const [sections, setSections] = useState([]);
    const [timetables, setTimetables] = useState([]);
    
    const [editingId, setEditingId] = useState(null);
    const [tempTitle, setTempTitle] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [progRes, yearRes, secRes, ttRes] = await Promise.all([
                api.get('/programs'),
                api.get('/academicyears'),
                api.get('/sections'),
                api.get('/timetables')
            ]);
            setPrograms(progRes.data);
            setYears(yearRes.data);
            setSections(secRes.data);
            
            // Raw data from server
            const rawTT = ttRes.data;
            
            // Format for PreviewGrid
            const formatted = rawTT.map(t => ({
                _id: t._id,
                sectionId: t.sectionId?._id || t.sectionId,
                sectionName: t.sectionId?.name || 'Unknown',
                programId: t.programId,
                yearId: t.yearId,
                generationId: t.generationId,
                courseId: t.courseId?._id || t.courseId,
                courseName: t.courseId?.name || 'Unknown',
                teacherId: t.teacherId?._id || t.teacherId,
                teacherName: t.teacherId?.name || 'Unknown',
                roomId: t.roomId?._id || t.roomId,
                roomName: t.roomId?.name || 'Unknown',
                day: t.day,
                slot: t.slot,
                component: t.component,
                customName: t.customName,
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

    useEffect(() => {
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

    // Grouping by Section + Generation
    const archiveGroups = useMemo(() => {
        const groups = {};
        timetables.forEach(item => {
            const key = `${item.sectionId}-${item.generationId}`;
            if (!groups[key]) {
                groups[key] = {
                    key,
                    sectionId: item.sectionId,
                    generationId: item.generationId,
                    programId: item.programId,
                    yearId: item.yearId,
                    sectionName: item.sectionName,
                    customName: item.customName,
                    entries: []
                };
            }
            groups[key].entries.push(item);
        });
        
        return Object.values(groups).map(g => ({
            ...g,
            defaultName: `${programMap[g.programId] || 'Program'} - Year ${yearMap[g.yearId] || '?'} - ${g.sectionName}`,
            displayName: g.customName || `${programMap[g.programId] || 'Program'} - Year ${yearMap[g.yearId] || '?'} - ${g.sectionName}`
        })).sort((a, b) => b.displayName.localeCompare(a.displayName));
    }, [timetables, programMap, yearMap]);

    const handleRename = async (group) => {
        try {
            await api.put('/timetables/bulk-update-name', {
                sectionId: group.sectionId,
                generationId: group.generationId,
                customName: tempTitle
            });
            setEditingId(null);
            fetchData(); // Refresh data
        } catch (err) {
            setError('Failed to update name.');
        }
    };

    const startEditing = (e, group) => {
        e.stopPropagation();
        setEditingId(group.key);
        setTempTitle(group.displayName);
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Archived Schedules...</div>;
    }

    if (viewMode === 'DETAIL' && selectedArchive) {
        return (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    <button onClick={() => setViewMode('LIST')} className="st-btn st-btn-secondary" style={{ padding: '8px' }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{selectedArchive.displayName}</h2>
                            <button className="st-btn-ghost" onClick={(e) => {
                                setViewMode('LIST');
                                startEditing(e, selectedArchive);
                            }}>
                                <Edit3 size={16} color="var(--secondary)" />
                            </button>
                        </div>
                        <p style={{ color: 'var(--secondary)', fontSize: '14px', margin: 0 }}>
                            {programMap[selectedArchive.programId]} • Year {yearMap[selectedArchive.yearId]} • Section {selectedArchive.sectionName}
                        </p>
                    </div>
                </header>

                <div className="apple-card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
                    <PreviewGrid 
                        timetable={selectedArchive.entries} 
                        title={selectedArchive.displayName}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
                <div>
                    <p className="page-eyebrow">Academic Records</p>
                    <h2 className="page-title">Schedules Archive</h2>
                    <p className="page-subtitle">Historical records of all published section timetables.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="st-status-pill st-status-active" style={{ fontSize: '11px', padding: '6px 12px' }}>
                        {archiveGroups.length} Archive Groups
                    </div>
                </div>
            </div>

            {error && (
                <div style={{ padding: '16px', backgroundColor: 'var(--error-container)', color: 'var(--on-error-container)', borderRadius: '12px', marginBottom: '24px' }}>
                    {error}
                </div>
            )}

            {archiveGroups.length === 0 ? (
                <div className="apple-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
                    <div style={{ 
                        width: '80px', height: '80px', background: 'var(--surface-low)', 
                        borderRadius: '24px', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', margin: '0 auto 24px' 
                    }}>
                        <Archive size={32} color="var(--secondary)" />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>No Archived Timetables</h3>
                    <p style={{ color: 'var(--secondary)', fontSize: '15px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
                        Once you finalize and publish section maps in the Solver, they will populate this archive.
                    </p>
                </div>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                    gap: '20px' 
                }}>
                    {archiveGroups.map(group => (
                        <div 
                            key={group.key} 
                            className="apple-card" 
                            style={{ 
                                padding: '24px', 
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                border: '1px solid var(--outline-variant)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px'
                            }}
                            onClick={() => {
                                setSelectedArchive(group);
                                setViewMode('DETAIL');
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ 
                                    padding: '10px', 
                                    background: 'var(--surface-low)', 
                                    borderRadius: '12px',
                                    color: 'var(--primary)'
                                }}>
                                    <Calendar size={20} />
                                </div>
                                {editingId === group.key ? (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="st-btn-ghost" onClick={(e) => { e.stopPropagation(); handleRename(group); }}>
                                            <Check size={16} color="#15803d" />
                                        </button>
                                        <button className="st-btn-ghost" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                                            <X size={16} color="#b91c1c" />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        className="st-btn-ghost" 
                                        onClick={(e) => startEditing(e, group)}
                                        title="Rename Archive"
                                    >
                                        <Edit3 size={16} color="var(--secondary)" />
                                    </button>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                {editingId === group.key ? (
                                    <input 
                                        autoFocus
                                        className="st-input"
                                        style={{ width: '100%', marginBottom: '8px' }}
                                        value={tempTitle}
                                        onChange={e => setTempTitle(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleRename(group);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                    />
                                ) : (
                                    <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', lineHeight: 1.3 }}>
                                        {group.displayName}
                                    </h4>
                                )}
                                <p style={{ color: 'var(--secondary)', fontSize: '13px', margin: 0 }}>
                                    Published Code: {group.generationId.slice(-6).toUpperCase()}
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--outline-variant)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--secondary)' }}>
                                    <GraduationCap size={14} />
                                    <span>{programMap[group.programId]}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--secondary)' }}>
                                    <BookOpen size={14} />
                                    <span>Year {yearMap[group.yearId]} • Section {group.sectionName}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <span style={{ 
                                    fontSize: '11px', 
                                    fontWeight: 700, 
                                    color: 'var(--primary)', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.05em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    Open Timetable <ArrowLeft size={12} style={{ transform: 'rotate(180deg)' }} />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
