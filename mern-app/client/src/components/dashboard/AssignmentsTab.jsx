import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Plus, Trash2 } from 'lucide-react';

export const AssignmentsTab = () => {
    const [teachers, setTeachers] = useState([]);
    const [sections, setSections] = useState([]);
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [msg, setMsg] = useState('');
    const [aForm, setAForm] = useState({ sectionId: '', courseId: '', teacherIds: [] });

    const load = async () => {
        try {
            const [t, s, c, a] = await Promise.all([
                api.get('/teachers'), api.get('/sections'), api.get('/courses'), api.get('/courseassignments')
            ]);
            setTeachers(t.data); setSections(s.data); setCourses(c.data); setAssignments(a.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const addEntity = async (entity, data, resetFn) => {
        setMsg('');
        try {
            await api.post(`/${entity}`, data);
            setMsg(`${entity} created.`);
            resetFn();
            load();
        } catch (err) {
            setMsg(err.response?.data?.error || `Failed to create ${entity}`);
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

            {/* Read-Only Teachers */}
            <div className="glass-panel entity-section">
                <h3>Available Teachers</h3>
                <p className="hint-text">Teachers are created in the Users tab and displayed here.</p>
                <div className="entity-chips">
                    {teachers.map(t => (
                        <span key={t._id} className="chip">
                            {t.name} ({t.maxHoursPerWeek}h)
                            <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('teachers', t._id)} />
                        </span>
                    ))}
                </div>
            </div>

            {/* Course Assignments */}
            <div className="glass-panel entity-section">
                <h3>Course Assignments</h3>
                <p className="hint-text">Link a Section → Course → Allowed Teachers</p>
                <div className="form-row">
                    <select className="input-field" value={aForm.sectionId}
                        onChange={e => setAForm({ ...aForm, sectionId: e.target.value })}>
                        <option value="">— Section —</option>
                        {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    <select className="input-field" value={aForm.courseId}
                        onChange={e => setAForm({ ...aForm, courseId: e.target.value })}>
                        <option value="">— Course —</option>
                        {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                    </select>
                    <select className="input-field" multiple value={aForm.teacherIds}
                        onChange={e => setAForm({ ...aForm, teacherIds: Array.from(e.target.selectedOptions, o => o.value) })}
                        style={{ minHeight: '60px' }}>
                        {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() =>
                        addEntity('courseassignments', aForm, () => setAForm({ sectionId: '', courseId: '', teacherIds: [] }))}>
                        <Plus size={16} /> Assign
                    </button>
                </div>
                <div className="entity-chips">
                    {assignments.map(a => (
                        <span key={a._id} className="chip">
                            Sec:{a.sectionId?.substring(0,6)}… → Crs:{a.courseId?.substring(0,6)}…
                            <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('courseassignments', a._id)} />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
