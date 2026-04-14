import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Plus, Trash2 } from 'lucide-react';

export const InfrastructureTab = () => {
    const [sections, setSections] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [msg, setMsg] = useState('');

    const [sForm, setSForm] = useState({ name: '', strength: 60 });
    const [rForm, setRForm] = useState({ name: '', type: 'lecture', capacity: 60 });
    const [cForm, setCForm] = useState({ 
        name: '', 
        code: '', 
        theoryHours: 3, 
        labHours: 0, 
        theoryConsecutive: 1, 
        labConsecutive: 2 
    });

    const load = async () => {
        try {
            const [s, r, c] = await Promise.all([
                api.get('/sections'), api.get('/rooms'), api.get('/courses')
            ]);
            setSections(s.data); setRooms(r.data); setCourses(c.data);
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

            {/* Sections */}
            <div className="glass-panel entity-section" style={{ marginBottom: '1.5rem' }}>
                <h3>Sections</h3>
                <div className="form-grid">
                    <div className="input-group">
                        <label className="input-label">Section Name</label>
                        <input className="input-field" placeholder="e.g. CSE-A" value={sForm.name}
                            onChange={e => setSForm({ ...sForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Student Strength</label>
                        <input className="input-field" type="number" placeholder="Strength" value={sForm.strength}
                            onChange={e => setSForm({ ...sForm, strength: Number(e.target.value) })} />
                    </div>
                    <button className="btn btn-primary" style={{ alignSelf: 'flex-end', height: '42px' }} onClick={() =>
                        addEntity('sections', sForm, () => setSForm({ name: '', strength: 60 }))}>
                        <Plus size={16} /> Add Section
                    </button>
                </div>
                <div className="entity-chips" style={{ marginTop: '1rem' }}>
                    {sections.map(s => (
                        <span key={s._id} className="chip">
                            {s.name} ({s.strength} students)
                            <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('sections', s._id)} />
                        </span>
                    ))}
                </div>
            </div>

            {/* Rooms */}
            <div className="glass-panel entity-section" style={{ marginBottom: '1.5rem' }}>
                <h3>Rooms</h3>
                <div className="form-grid">
                    <div className="input-group">
                        <label className="input-label">Room Number/Name</label>
                        <input className="input-field" placeholder="Room Name" value={rForm.name}
                            onChange={e => setRForm({ ...rForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Room Type</label>
                        <select className="input-field" value={rForm.type}
                            onChange={e => setRForm({ ...rForm, type: e.target.value })}>
                            <option value="lecture">Lecture Hall</option>
                            <option value="lab">Laboratory</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Capacity</label>
                        <input className="input-field" type="number" placeholder="Capacity" value={rForm.capacity}
                            onChange={e => setRForm({ ...rForm, capacity: Number(e.target.value) })} />
                    </div>
                    <button className="btn btn-primary" style={{ alignSelf: 'flex-end', height: '42px' }} onClick={() =>
                        addEntity('rooms', rForm, () => setRForm({ name: '', type: 'lecture', capacity: 60 }))}>
                        <Plus size={16} /> Add Room
                    </button>
                </div>
                <div className="entity-chips" style={{ marginTop: '1rem' }}>
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
                <h3>Unified Courses (Theory + Lab)</h3>
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                    <div className="input-group">
                        <label className="input-label">Course Name</label>
                        <input className="input-field" placeholder="Course Name" value={cForm.name}
                            onChange={e => setCForm({ ...cForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Course Code</label>
                        <input className="input-field" placeholder="CS101" value={cForm.code}
                            onChange={e => setCForm({ ...cForm, code: e.target.value })} />
                    </div>
                    
                    <div className="form-row" style={{ gap: '1rem' }}>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label className="input-label">Theory Hours / Week</label>
                            <input className="input-field" type="number" placeholder="Th Hours" value={cForm.theoryHours}
                                onChange={e => setCForm({ ...cForm, theoryHours: Number(e.target.value) })} />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label className="input-label">Theory Consecutive Slots</label>
                            <input className="input-field" type="number" placeholder="Th Consec" value={cForm.theoryConsecutive}
                                onChange={e => setCForm({ ...cForm, theoryConsecutive: Number(e.target.value) })} />
                        </div>
                    </div>

                    <div className="form-row" style={{ gap: '1rem' }}>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label className="input-label">Lab Hours / Week</label>
                            <input className="input-field" type="number" placeholder="Lab Hours" value={cForm.labHours}
                                onChange={e => setCForm({ ...cForm, labHours: Number(e.target.value) })} />
                        </div>
                        <div className="input-group" style={{ flex: 1 }}>
                            <label className="input-label">Lab Consecutive Slots</label>
                            <input className="input-field" type="number" placeholder="Lab Consec" value={cForm.labConsecutive}
                                onChange={e => setCForm({ ...cForm, labConsecutive: Number(e.target.value) })} />
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }} onClick={() =>
                        addEntity('courses', cForm, () => setCForm({ name: '', code: '', theoryHours: 3, labHours: 0, theoryConsecutive: 1, labConsecutive: 2 }))}>
                        <Plus size={16} /> Add Unified Course
                    </button>
                </div>
                <div className="entity-chips">
                    {courses.map(c => (
                        <span key={c._id} className="chip">
                            {c.name} ({c.code}) — 
                            {c.theoryHours > 0 && ` ${c.theoryHours}h Th`}
                            {c.labHours > 0 && ` ${c.labHours}h Lb`}
                            <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('courses', c._id)} />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
