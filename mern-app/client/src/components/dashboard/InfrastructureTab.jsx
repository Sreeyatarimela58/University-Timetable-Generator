import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Plus, Trash2, Info } from 'lucide-react';

export const InfrastructureTab = () => {
    const [sections, setSections] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [msg, setMsg] = useState('');

    const [sForm, setSForm] = useState({ name: '', strength: 60 });
    const [rForm, setRForm] = useState({ name: '', type: 'lecture', capacity: 60 });
    
    // Unified Course Form with Session Builder
    const [cForm, setCForm] = useState({ 
        name: '', 
        code: '', 
        theoryTotal: 3, 
        theorySessions: [2, 1],
        labTotal: 0, 
        labSessions: [] 
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
        
        // Validation for Course Session Sum
        if (entity === 'courses') {
            const thSum = data.theorySessions.reduce((a, b) => a + b, 0);
            const lbSum = data.labSessions.reduce((a, b) => a + b, 0);
            
            if (data.theoryTotal > 0 && thSum !== data.theoryTotal) {
                setMsg(`Error: Theory session sum (${thSum}) must equal total hours (${data.theoryTotal})`);
                return;
            }
            if (data.labTotal > 0 && lbSum !== data.labTotal) {
                setMsg(`Error: Lab session sum (${lbSum}) must equal total hours (${data.labTotal})`);
                return;
            }
            // Max length validation (2h)
            if ([...data.theorySessions, ...data.labSessions].some(s => s > 2)) {
                setMsg('Error: Maximum slot duration is 2 hours.');
                return;
            }
        }

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

    const handleSessionCountChange = (type, count) => {
        const total = type === 'theory' ? cForm.theoryTotal : cForm.labTotal;
        const currentArr = type === 'theory' ? cForm.theorySessions : cForm.labSessions;
        
        let newArr = [...currentArr];
        if (count > currentArr.length) {
            // Add slots (default to 1)
            for (let i = currentArr.length; i < count; i++) newArr.push(1);
        } else {
            // Remove slots
            newArr = newArr.slice(0, count);
        }
        
        if (type === 'theory') setCForm({ ...cForm, theorySessions: newArr });
        else setCForm({ ...cForm, labSessions: newArr });
    };

    const updateSessionVal = (type, index, val) => {
        const newArr = type === 'theory' ? [...cForm.theorySessions] : [...cForm.labSessions];
        newArr[index] = Number(val);
        if (type === 'theory') setCForm({ ...cForm, theorySessions: newArr });
        else setCForm({ ...cForm, labSessions: newArr });
    };

    return (
        <div className="tab-content">
            {msg && <div className={`glass-panel form-msg ${msg.includes('Error') ? 'error-text' : ''}`} style={{ marginBottom: '1rem' }}>{msg}</div>}

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
                        <input className="input-field" type="number" placeholder="60" value={sForm.strength}
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
                            {s.name} ({s.strength})
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
                        <label className="input-label">Room Name</label>
                        <input className="input-field" placeholder="R101" value={rForm.name}
                            onChange={e => setRForm({ ...rForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Type</label>
                        <select className="input-field" value={rForm.type}
                            onChange={e => setRForm({ ...rForm, type: e.target.value })}>
                            <option value="lecture">Lecture Hall</option>
                            <option value="lab">Laboratory</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Capacity</label>
                        <input className="input-field" type="number" value={rForm.capacity}
                            onChange={e => setRForm({ ...rForm, capacity: Number(e.target.value) })} />
                    </div>
                    <button className="btn btn-primary" style={{ alignSelf: 'flex-end', height: '42px' }} onClick={() =>
                        addEntity('rooms', rForm, () => setRForm({ name: '', type: 'lecture', capacity: 60 }))}>
                        <Plus size={16} /> Add Room
                    </button>
                </div>
            </div>

            {/* Course & Session Builder */}
            <div className="glass-panel entity-section">
                <h3>Unified Course Builder</h3>
                <div className="form-grid">
                    <div className="input-group">
                        <label className="input-label">Course Name</label>
                        <input className="input-field" placeholder="Algorithms" value={cForm.name}
                            onChange={e => setCForm({ ...cForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Course Code</label>
                        <input className="input-field" placeholder="CS201" value={cForm.code}
                            onChange={e => setCForm({ ...cForm, code: e.target.value })} />
                    </div>

                    {/* Theory Session Builder */}
                    <div className="glass-panel" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0 }}>Theory Sessions</h4>
                            <div className="hint-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Info size={14} /> Max 2 hours per slot
                            </div>
                        </div>
                        <div className="form-row" style={{ alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ width: '120px' }}>
                                <label className="input-label">Total Hrs</label>
                                <input className="input-field" type="number" value={cForm.theoryTotal}
                                    onChange={e => setCForm({ ...cForm, theoryTotal: Number(e.target.value) })} />
                            </div>
                            <div className="input-group" style={{ width: '120px' }}>
                                <label className="input-label">No. of Slots</label>
                                <input className="input-field" type="number" min="0" max={cForm.theoryTotal} value={cForm.theorySessions.length}
                                    onChange={e => handleSessionCountChange('theory', Number(e.target.value))} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                {cForm.theorySessions.map((dur, i) => (
                                    <div key={i} className="input-group" style={{ width: '70px' }}>
                                        <label className="input-label">Slot {i+1}</label>
                                        <input className="input-field" type="number" min="1" max="2" value={dur}
                                            onChange={e => updateSessionVal('theory', i, e.target.value)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Lab Session Builder */}
                    <div className="glass-panel" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Lab Sessions</h4>
                        <div className="form-row" style={{ alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ width: '120px' }}>
                                <label className="input-label">Total Hrs</label>
                                <input className="input-field" type="number" value={cForm.labTotal}
                                    onChange={e => setCForm({ ...cForm, labTotal: Number(e.target.value) })} />
                            </div>
                            <div className="input-group" style={{ width: '120px' }}>
                                <label className="input-label">No. of Slots</label>
                                <input className="input-field" type="number" min="0" value={cForm.labSessions.length}
                                    onChange={e => handleSessionCountChange('lab', Number(e.target.value))} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                                {cForm.labSessions.map((dur, i) => (
                                    <div key={i} className="input-group" style={{ width: '70px' }}>
                                        <label className="input-label">Slot {i+1}</label>
                                        <input className="input-field" type="number" min="1" max="2" value={dur}
                                            onChange={e => updateSessionVal('lab', i, e.target.value)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}
                        onClick={() => addEntity('courses', cForm, () => setCForm({ name: '', code: '', theoryTotal: 3, theorySessions: [2, 1], labTotal: 0, labSessions: [] }))}>
                        Create Unified Course with Session Plan
                    </button>
                </div>

                <div className="entity-chips" style={{ marginTop: '1.5rem' }}>
                    {courses.map(c => (
                        <span key={c._id} className="chip">
                            <strong>{c.name} ({c.code})</strong> — 
                            {c.theoryTotal > 0 && ` Th: ${c.theorySessions.join('+')}=${c.theoryTotal}h`}
                            {c.labTotal > 0 && ` | Lb: ${c.labSessions.join('+')}=${c.labTotal}h`}
                            <Trash2 size={14} className="chip-delete" onClick={() => deleteEntity('courses', c._id)} />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};
