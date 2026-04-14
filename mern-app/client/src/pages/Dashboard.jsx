import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { PreviewGrid } from '../components/PreviewGrid';
import { Users, Database, Zap, Plus, Trash2, Eye, Send, Loader2, AlertTriangle } from 'lucide-react';

// ─── Tab 1: Users ───────────────────────────────────────────────
const UsersTab = () => {
    const [users, setUsers] = useState([]);
    const [sections, setSections] = useState([]);
    const [form, setForm] = useState({ username: '', name: '', password: '', role: 'student', sectionId: '' });
    const [msg, setMsg] = useState('');

    const load = async () => {
        try {
            const [u, s] = await Promise.all([
                api.get('/users'),
                api.get('/sections')
            ]);
            setUsers(u.data);
            setSections(s.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setMsg('');
        try {
            await api.post('/users', {
                username: form.username, // ID No
                name: form.name,
                password: form.password,
                role: form.role,
                sectionId: form.sectionId
            });
            setMsg('Profile and Login provisioned.');
            setForm({ username: '', name: '', password: '', role: 'student', sectionId: '' });
            load();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Failed to create profile');
        }
    };

    return (
        <div className="tab-content">
            <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={20} /> Create New Profile
                </h3>
                <p className="hint-text">
                    This will create both the physical profile and the login account (ID No = Username).
                </p>
                <form onSubmit={handleCreate} className="form-grid">
                    <input className="input-field" placeholder="Full Name" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} required />
                    <input className="input-field" placeholder="ID Number (becomes login username)" value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })} required />
                    <input className="input-field" placeholder="Login Password" type="password" value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })} required />
                    <select className="input-field" value={form.role}
                        onChange={e => setForm({ ...form, role: e.target.value, sectionId: '' })}>
                        <option value="student">Student</option>
                        <option value="prof">Professor</option>
                    </select>

                    {form.role === 'student' && (
                        <select className="input-field" value={form.sectionId}
                            onChange={e => setForm({ ...form, sectionId: e.target.value })} required>
                            <option value="">— Assign to Section —</option>
                            {sections.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ gridColumn: '1 / -1' }}>
                        Create Profile & Account
                    </button>
                    {msg && <div className="form-msg" style={{ gridColumn: '1 / -1' }}>{msg}</div>}
                </form>
            </div>

            <div className="glass-panel">
                <h3>Existing Accounts</h3>
                {users.length === 0
                    ? <p className="hint-text">No student/professor accounts yet.</p>
                    : (
                        <table className="data-table">
                            <thead>
                                <tr><th>Username</th><th>Role</th><th>Linked Entity</th></tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u._id}>
                                        <td>{u.username}</td>
                                        <td className="role-badge">{u.role}</td>
                                        <td className="mono">{u.profileId || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
                }
            </div>
        </div>
    );
};

// ─── Tab 2: Timetable Data ──────────────────────────────────────
const DataTab = () => {
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [sections, setSections] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [msg, setMsg] = useState('');

    // Form states
    const [tForm, setTForm] = useState({ name: '', maxHoursPerWeek: 20 });
    const [stuForm, setStuForm] = useState({ name: '', rollNumber: '', email: '', sectionId: '' });
    const [sForm, setSForm] = useState({ name: '', strength: 60 });
    const [rForm, setRForm] = useState({ name: '', type: 'lecture', capacity: 60 });
    const [cForm, setCForm] = useState({ name: '', code: '', type: 'theory', hoursPerWeek: 3, consecutiveSlotsRequired: 1 });
    const [aForm, setAForm] = useState({ sectionId: '', courseId: '', teacherIds: [] });

    const load = async () => {
        try {
            const [t, stu, s, r, c, a] = await Promise.all([
                api.get('/teachers'), api.get('/students'), api.get('/sections'), api.get('/rooms'),
                api.get('/courses'), api.get('/courseassignments')
            ]);
            setTeachers(t.data); setStudents(stu.data); setSections(s.data); setRooms(r.data);
            setCourses(c.data); setAssignments(a.data);
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

            {/* Teachers */}
            <div className="glass-panel entity-section">
                <h3>Teachers</h3>
                <div className="form-row">
                    <input className="input-field" placeholder="Name" value={tForm.name}
                        onChange={e => setTForm({ ...tForm, name: e.target.value })} />
                    <input className="input-field" type="number" placeholder="Max Hrs/Week" value={tForm.maxHoursPerWeek}
                        onChange={e => setTForm({ ...tForm, maxHoursPerWeek: Number(e.target.value) })} />
                    <button className="btn btn-primary" onClick={() =>
                        addEntity('teachers', tForm, () => setTForm({ name: '', maxHoursPerWeek: 20 }))}>
                        <Plus size={16} /> Add
                    </button>
                </div>
                <div className="entity-chips">
                    {teachers.map(t => (
                        <span key={t._id} className="chip">
                            {t.name} ({t.maxHoursPerWeek}h)
                            <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('teachers', t._id)} />
                        </span>
                    ))}
                </div>
            </div>

            {/* Students */}
            <div className="glass-panel entity-section">
                <h3>Students</h3>
                <div className="form-row">
                    <input className="input-field" placeholder="Student Name" value={stuForm.name}
                        onChange={e => setStuForm({ ...stuForm, name: e.target.value })} />
                    <input className="input-field" placeholder="Roll Number" value={stuForm.rollNumber}
                        onChange={e => setStuForm({ ...stuForm, rollNumber: e.target.value })} />
                    <input className="input-field" placeholder="Email" value={stuForm.email}
                        onChange={e => setStuForm({ ...stuForm, email: e.target.value })} />
                    <select className="input-field" value={stuForm.sectionId}
                        onChange={e => setStuForm({ ...stuForm, sectionId: e.target.value })}>
                        <option value="">— Assign to Section (optional) —</option>
                        {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={() =>
                        addEntity('students', stuForm, () => setStuForm({ name: '', rollNumber: '', email: '', sectionId: '' }))}>
                        <Plus size={16} /> Add
                    </button>
                </div>
                <div className="entity-chips">
                    {students.map(s => {
                        const sec = sections.find(sec => sec._id === s.sectionId);
                        return (
                            <span key={s._id} className="chip">
                                {s.name} ({s.rollNumber}){sec ? ` → ${sec.name}` : ' [Unassigned]'}
                                <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('students', s._id)} />
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Sections */}
            <div className="glass-panel entity-section">
                <h3>Sections</h3>
                <div className="form-row">
                    <input className="input-field" placeholder="Name (e.g. CSE-A)" value={sForm.name}
                        onChange={e => setSForm({ ...sForm, name: e.target.value })} />
                    <input className="input-field" type="number" placeholder="Strength" value={sForm.strength}
                        onChange={e => setSForm({ ...sForm, strength: Number(e.target.value) })} />
                    <button className="btn btn-primary" onClick={() =>
                        addEntity('sections', sForm, () => setSForm({ name: '', strength: 60 }))}>
                        <Plus size={16} /> Add
                    </button>
                </div>
                <div className="entity-chips">
                    {sections.map(s => (
                        <span key={s._id} className="chip">
                            {s.name} ({s.strength} students)
                            <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('sections', s._id)} />
                        </span>
                    ))}
                </div>
            </div>

            {/* Rooms */}
            <div className="glass-panel entity-section">
                <h3>Rooms</h3>
                <div className="form-row">
                    <input className="input-field" placeholder="Room Name" value={rForm.name}
                        onChange={e => setRForm({ ...rForm, name: e.target.value })} />
                    <select className="input-field" value={rForm.type}
                        onChange={e => setRForm({ ...rForm, type: e.target.value })}>
                        <option value="lecture">Lecture Hall</option>
                        <option value="lab">Laboratory</option>
                    </select>
                    <input className="input-field" type="number" placeholder="Capacity" value={rForm.capacity}
                        onChange={e => setRForm({ ...rForm, capacity: Number(e.target.value) })} />
                    <button className="btn btn-primary" onClick={() =>
                        addEntity('rooms', rForm, () => setRForm({ name: '', type: 'lecture', capacity: 60 }))}>
                        <Plus size={16} /> Add
                    </button>
                </div>
                <div className="entity-chips">
                    {rooms.map(r => (
                        <span key={r._id} className="chip">
                            {r.name} — {r.type} ({r.capacity})
                            <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('rooms', r._id)} />
                        </span>
                    ))}
                </div>
            </div>

            {/* Courses */}
            <div className="glass-panel entity-section">
                <h3>Courses</h3>
                <div className="form-row">
                    <input className="input-field" placeholder="Course Name" value={cForm.name}
                        onChange={e => setCForm({ ...cForm, name: e.target.value })} />
                    <input className="input-field" placeholder="Code (e.g. CS101)" value={cForm.code}
                        onChange={e => setCForm({ ...cForm, code: e.target.value })} />
                    <select className="input-field" value={cForm.type}
                        onChange={e => setCForm({ ...cForm, type: e.target.value })}>
                        <option value="theory">Theory</option>
                        <option value="lab">Lab</option>
                    </select>
                    <input className="input-field" type="number" placeholder="Hrs/Week" value={cForm.hoursPerWeek}
                        onChange={e => setCForm({ ...cForm, hoursPerWeek: Number(e.target.value) })} />
                    <button className="btn btn-primary" onClick={() =>
                        addEntity('courses', cForm, () => setCForm({ name: '', code: '', type: 'theory', hoursPerWeek: 3, consecutiveSlotsRequired: 1 }))}>
                        <Plus size={16} /> Add
                    </button>
                </div>
                <div className="entity-chips">
                    {courses.map(c => (
                        <span key={c._id} className="chip">
                            {c.name} ({c.code}) — {c.type}, {c.hoursPerWeek}h/wk
                            <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('courses', c._id)} />
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

// ─── Tab 3: Generate Drafts ─────────────────────────────────────
const GenerateTab = () => {
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [draftId, setDraftId] = useState(null);
    const [drafts, setDrafts] = useState([]);   // array of { score, timetable }
    const [selected, setSelected] = useState(null); // index
    const [publishMsg, setPublishMsg] = useState('');

    const handleGenerate = async () => {
        setGenerating(true);
        setError('');
        setDraftId(null);
        setDrafts([]);
        setSelected(null);
        setPublishMsg('');
        try {
            const res = await api.post('/generate-drafts');
            const id = res.data.draftId;
            setDraftId(id);
            // Now fetch the full draft data
            const draftRes = await api.get(`/drafts/${id}`);
            setDrafts(draftRes.data.drafts || []);
        } catch (err) {
            if (err.response?.status === 423) {
                setError('Another generation is already running. Please wait.');
            } else if (err.response?.status === 400) {
                setError(err.response.data.error || 'Missing timetable data.');
            } else {
                setError(err.response?.data?.error || 'Generation failed. Check server logs.');
            }
        } finally {
            setGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (selected === null || !draftId) return;
        setPublishMsg('');
        try {
            const res = await api.post(`/publish/${draftId}/${selected}`);
            setPublishMsg(res.data.message);
            setDrafts([]);
            setDraftId(null);
            setSelected(null);
        } catch (err) {
            setPublishMsg(err.response?.data?.error || 'Publish failed.');
        }
    };

    return (
        <div className="tab-content">
            {/* Generate Controls */}
            <div className="glass-panel" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h3><Zap size={20} style={{ verticalAlign: 'middle' }} /> Timetable Solver</h3>
                <p className="hint-text" style={{ marginBottom: '1rem' }}>
                    Generates 3 scored draft timetables for review. Select the best, then publish.
                </p>
                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}
                    style={{ fontSize: '1.1rem', padding: '0.8rem 2.5rem' }}>
                    {generating
                        ? <><Loader2 size={20} className="spin" /> Computing Drafts...</>
                        : <><Zap size={20} /> Generate 3 Drafts</>
                    }
                </button>
                {error && (
                    <div className="error-box" style={{ marginTop: '1rem' }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}
            </div>

            {/* Draft Selection */}
            {drafts.length > 0 && (
                <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                    <h3>Select a Draft</h3>
                    <div className="draft-options">
                        {drafts.map((d, idx) => (
                            <button key={idx}
                                className={`draft-option-btn ${selected === idx ? 'draft-selected' : ''}`}
                                onClick={() => setSelected(idx)}>
                                <Eye size={18} />
                                <span className="draft-label">Option {String.fromCharCode(65 + idx)}</span>
                                <span className="draft-score">Score: {d.score}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview of selected draft */}
            {selected !== null && drafts[selected] && (
                <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                    <PreviewGrid
                        timetable={drafts[selected].timetable}
                        title={`Draft ${String.fromCharCode(65 + selected)} — Score: ${drafts[selected].score}`}
                    />
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <button className="btn btn-publish" onClick={handlePublish}>
                            <Send size={18} /> Publish Draft {String.fromCharCode(65 + selected)}
                        </button>
                    </div>
                </div>
            )}

            {/* Publish confirmation */}
            {publishMsg && (
                <div className="glass-panel success-box">
                    {publishMsg}
                </div>
            )}
        </div>
    );
};

// ─── Main Dashboard Shell ───────────────────────────────────────
export const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('users');

    const tabs = [
        { key: 'users', label: 'Users', icon: <Users size={18} /> },
        { key: 'data', label: 'Timetable Data', icon: <Database size={18} /> },
        { key: 'generate', label: 'Generate Drafts', icon: <Zap size={18} /> }
    ];

    return (
        <div>
            {/* Tab Bar */}
            <div className="tab-bar">
                {tabs.map(t => (
                    <button key={t.key}
                        className={`tab-btn ${activeTab === t.key ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab(t.key)}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'data' && <DataTab />}
            {activeTab === 'generate' && <GenerateTab />}
        </div>
    );
};
