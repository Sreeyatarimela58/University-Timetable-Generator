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
    const [cForm, setCForm] = useState({ name: '', code: '', type: 'theory', hoursPerWeek: 3, consecutiveSlotsRequired: 1 });

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
        </div>
    );
};
