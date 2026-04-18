import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Plus, Trash2, Link, Users, BookOpen } from 'lucide-react';

export const AssignmentsTab = () => {
    const [teachers,    setTeachers]    = useState([]);
    const [sections,    setSections]    = useState([]);
    const [courses,     setCourses]     = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [msg,         setMsg]         = useState({ text: '', isError: false });

    const [aForm, setAForm] = useState({
        sectionId: '',
        courseId: '',
        theoryTeacherIds: [],
        labTeacherIds: [],
    });

    const load = async () => {
        try {
            const [t, s, c, a] = await Promise.all([
                api.get('/teachers'), api.get('/sections'),
                api.get('/courses'), api.get('/courseassignments'),
            ]);
            setTeachers(t.data); setSections(s.data);
            setCourses(c.data);  setAssignments(a.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const showMsg = (text, isError = false) => {
        setMsg({ text, isError });
        setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    };

    const selectedCourse = courses.find(c => c._id === aForm.courseId);

    const addAssignment = async () => {
        try {
            await api.post('/courseassignments', aForm);
            showMsg('Assignment created successfully.');
            setAForm({ sectionId: '', courseId: '', theoryTeacherIds: [], labTeacherIds: [] });
            load();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to create assignment', true);
        }
    };

    const deleteAssignment = async (id) => {
        try {
            await api.delete(`/courseassignments/${id}`);
            load();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Delete failed', true);
        }
    };

    return (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Form Panel - 3 Horizontal Cards */}
            <div className="section-panel" style={{ padding: '32px', border: 'none', background: 'transparent' }}>
                <div style={{ marginBottom: '24px' }}>
                    <div className="section-header" style={{ marginBottom: '8px' }}>
                        <Link size={20} color="var(--primary)" />
                        <h3 className="section-title">New Assignment</h3>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: 1.6 }}>
                        Link a Section → Course → Teachers for Theory & Lab sessions.
                    </p>
                </div>

                {msg.text && (
                    <div className={`alert ${msg.isError ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '20px' }}>
                        {msg.text}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                    
                    {/* Card 1: Details */}
                    <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="input-group">
                            <label className="input-label">Target Section</label>
                            <select className="input-field" value={aForm.sectionId}
                                onChange={e => setAForm({ ...aForm, sectionId: e.target.value })}>
                                <option value="">— Select Section —</option>
                                {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Course</label>
                            <select className="input-field" value={aForm.courseId}
                                onChange={e => setAForm({ ...aForm, courseId: e.target.value, theoryTeacherIds: [], labTeacherIds: [] })}>
                                <option value="">— Select Course —</option>
                                {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Card 2: Theory */}
                    <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                        {selectedCourse?.theoryTotal > 0 ? (
                            <div className="input-group" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <label className="input-label" style={{ marginBottom: '12px' }}>Theory Teacher(s)</label>
                                <div className="input-field" style={{ flex: 1, maxHeight: '200px', overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {teachers.map(t => (
                                        <label key={`theory-${t._id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px' }}>
                                            <input type="checkbox"
                                                checked={aForm.theoryTeacherIds.includes(t._id)}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setAForm(prev => ({
                                                        ...prev,
                                                        theoryTeacherIds: checked
                                                            ? [...prev.theoryTeacherIds, t._id]
                                                            : prev.theoryTeacherIds.filter(id => id !== t._id)
                                                    }));
                                                }}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                            />
                                            {t.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-low)', borderRadius: '12px', padding: '20px', border: '1px dashed var(--outline)' }}>
                                <p style={{ fontSize: '13px', color: 'var(--secondary)' }}>{selectedCourse ? 'No Theory Hours' : 'Select a course first'}</p>
                            </div>
                        )}
                    </div>

                    {/* Card 3: Lab & Submit */}
                    <div className="apple-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {selectedCourse?.labTotal > 0 ? (
                            <div className="input-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <label className="input-label" style={{ marginBottom: '12px' }}>Lab Teacher(s)</label>
                                <div className="input-field" style={{ flex: 1, maxHeight: '140px', overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {teachers.map(t => (
                                        <label key={`lab-${t._id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '6px 8px', borderRadius: '8px' }}>
                                            <input type="checkbox"
                                                checked={aForm.labTeacherIds.includes(t._id)}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setAForm(prev => ({
                                                        ...prev,
                                                        labTeacherIds: checked
                                                            ? [...prev.labTeacherIds, t._id]
                                                            : prev.labTeacherIds.filter(id => id !== t._id)
                                                    }));
                                                }}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                                            />
                                            {t.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-low)', borderRadius: '12px', padding: '20px', border: '1px dashed var(--outline)' }}>
                                <p style={{ fontSize: '13px', color: 'var(--secondary)' }}>{selectedCourse ? 'No Lab Hours' : 'Select a course first'}</p>
                            </div>
                        )}

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '13px', borderRadius: '14px', marginTop: 'auto' }}
                            onClick={addAssignment}
                            disabled={!aForm.sectionId || !aForm.courseId}
                        >
                            <Plus size={16} /> Assign Course
                        </button>
                    </div>

                </div>
            </div>

            {/* Assignments List + Faculty Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start', padding: '0 32px 32px' }}>

                {/* Assignment Cards */}
                <div className="section-panel">
                    <div className="section-header" style={{ marginBottom: '24px' }}>
                        <h3 className="section-title" style={{ fontSize: '17px' }}>
                            Active Assignments
                            <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--secondary)' }}>({assignments.length})</span>
                        </h3>
                    </div>

                    {assignments.length === 0 ? (
                        <div className="apple-card" style={{ padding: '48px', textAlign: 'center' }}>
                            <BookOpen size={32} color="var(--secondary)" style={{ margin: '0 auto 12px' }} />
                            <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>No assignments yet. Create the first one.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {assignments.map(a => (
                                <div key={a._id} className="item-card">
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: '14px' }}>
                                            {a.courseId?.name || '—'}
                                        </p>
                                        <p style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '3px' }}>
                                            Section: <strong>{a.sectionId?.name || '—'}</strong>
                                            {a.courseId?.code && <span style={{ marginLeft: '8px' }}>· <span className="mono" style={{ fontSize: '11px' }}>{a.courseId.code}</span></span>}
                                        </p>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                            {a.theoryTeacherIds?.length > 0 && (
                                                <span className="chip chip-primary">Theory: {a.theoryTeacherIds.map(t => t.name).join(', ')}</span>
                                            )}
                                            {a.labTeacherIds?.length > 0 && (
                                                <span className="chip">Lab: {a.labTeacherIds.map(t => t.name).join(', ')}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button className="btn btn-danger btn-icon" onClick={() => deleteAssignment(a._id)} title="Delete assignment">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Faculty Workload Summary */}
                {teachers.length > 0 && (
                    <div className="section-panel" style={{ padding: '24px' }}>
                        <div className="section-header" style={{ marginBottom: '16px' }}>
                            <Users size={18} color="var(--secondary)" />
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--on-surface)' }}>Faculty Workload</h4>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {teachers.map(t => (
                                <span key={t._id} className="chip" style={{ padding: '6px 12px', fontSize: '11px', background: 'var(--surface)', border: '1px solid var(--outline)' }}>
                                    {t.name} · {t.maxHoursPerWeek}h/wk
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
