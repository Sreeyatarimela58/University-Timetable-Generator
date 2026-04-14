import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Plus, Trash2 } from 'lucide-react';

export const AssignmentsTab = () => {
    const [teachers, setTeachers] = useState([]);
    const [sections, setSections] = useState([]);
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [msg, setMsg] = useState('');
    const [aForm, setAForm] = useState({ 
        sectionId: '', 
        courseId: '', 
        theoryTeacherIds: [], 
        labTeacherIds: [] 
    });

    const load = async () => {
        try {
            const [t, s, c, a] = await Promise.all([
                api.get('/teachers'), api.get('/sections'), api.get('/courses'), api.get('/courseassignments')
            ]);
            setTeachers(t.data); setSections(s.data); setCourses(c.data); setAssignments(a.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const selectedCourse = courses.find(c => c._id === aForm.courseId);

    const addAssignment = async () => {
        setMsg('');
        try {
            await api.post('/courseassignments', aForm);
            setMsg('Assignment created.');
            setAForm({ sectionId: '', courseId: '', theoryTeacherIds: [], labTeacherIds: [] });
            load();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Failed to create assignment');
        }
    };

    const deleteEntity = async (entity, id) => {
        try {
            await api.delete(`/${entity}/${id}`);
            load();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Delete failed');
        }
    };

    return (
        <div className="tab-content">
            {msg && <div className="glass-panel form-msg" style={{ marginBottom: '1rem' }}>{msg}</div>}

            <div className="glass-panel entity-section">
                <h3>Course Assignments</h3>
                <p className="hint-text">Link a Section → Course → Specific Teachers for Theory/Lab</p>
                
                <div className="form-grid">
                    <div className="input-group">
                        <label className="input-label">Target Section</label>
                        <select className="input-field" value={aForm.sectionId}
                            onChange={e => setAForm({ ...aForm, sectionId: e.target.value })}>
                            <option value="">— Select Section —</option>
                            {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Assigned Course</label>
                        <select className="input-field" value={aForm.courseId}
                            onChange={e => setAForm({ ...aForm, courseId: e.target.value, theoryTeacherIds: [], labTeacherIds: [] })}>
                            <option value="">— Select Course —</option>
                            {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                        </select>
                    </div>

                    {selectedCourse?.theoryHours > 0 && (
                        <div className="input-group">
                            <label className="input-label">Theory Teacher(s)</label>
                            <select className="input-field" multiple value={aForm.theoryTeacherIds}
                                onChange={e => setAForm({ ...aForm, theoryTeacherIds: Array.from(e.target.selectedOptions, o => o.value) })}
                                style={{ minHeight: '100px' }}>
                                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                            <span className="hint-text" style={{ fontSize: '0.7rem' }}>Hold Ctrl/Cmd to select multiple</span>
                        </div>
                    )}

                    {selectedCourse?.labHours > 0 && (
                        <div className="input-group">
                            <label className="input-label">Lab Teacher(s)</label>
                            <select className="input-field" multiple value={aForm.labTeacherIds}
                                onChange={e => setAForm({ ...aForm, labTeacherIds: Array.from(e.target.selectedOptions, o => o.value) })}
                                style={{ minHeight: '100px' }}>
                                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                            </select>
                            <span className="hint-text" style={{ fontSize: '0.7rem' }}>Hold Ctrl/Cmd to select multiple</span>
                        </div>
                    )}

                    <button className="btn btn-primary" style={{ gridColumn: '1 / -1', marginTop: '1rem' }} onClick={addAssignment}
                        disabled={!aForm.sectionId || !aForm.courseId}>
                        <Plus size={16} /> Assign Course to Section
                    </button>
                </div>

                <div className="entity-chips" style={{ marginTop: '1.5rem' }}>
                    {assignments.map(a => (
                        <span key={a._id} className="chip" style={{ display: 'block', padding: '1rem', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>{a.courseId?.name} → {a.sectionId?.name}</strong>
                                <Trash2 size={16} className="chip-delete" onClick={() => deleteEntity('courseassignments', a._id)} />
                            </div>
                            <div className="hint-text" style={{ fontSize: '0.86rem', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                                {a.theoryTeacherIds?.length > 0 && <span><strong>Th:</strong> {a.theoryTeacherIds.map(t => t.name).join(', ')}</span>}
                                {a.labTeacherIds?.length > 0 && <span style={{ marginLeft: '1rem' }}><strong>Lb:</strong> {a.labTeacherIds.map(t => t.name).join(', ')}</span>}
                            </div>
                        </span>
                    ))}
                </div>
            </div>

            {/* Read-Only Teachers for reference */}
            <div className="glass-panel entity-section" style={{ marginTop: '2rem' }}>
                <h3>Faculty Workload Info</h3>
                <div className="entity-chips">
                    {teachers.map(t => (
                        <span key={t._id} className="chip">
                            {t.name} ({t.maxHoursPerWeek}h max)
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
