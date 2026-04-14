import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Plus, Info, Edit2, Check, X } from 'lucide-react';

export const InfrastructureTab = () => {
    // Entities
    const [programs, setPrograms] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [sections, setSections] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [msg, setMsg] = useState('');

    // Form States
    const [pForm, setPForm] = useState({ name: '', durationYears: 4 });
    const [sForm, setSForm] = useState({ yearId: '', name: '', strength: 60 });
    const [sFilters, setSFilters] = useState({ programId: '' }); 
    const [rForm, setRForm] = useState({ name: '', type: 'classroom', capacity: 60 });
    const [cForm, setCForm] = useState({ name: '', code: '', theoryTotal: 3, theorySessions: [2, 1], labTotal: 0, labSessions: [] });
    const [slotErrors, setSlotErrors] = useState({ theory: '', lab: '' });

    // Editing State (for Section Strength)
    const [editSecId, setEditSecId] = useState(null);
    const [editStrength, setEditStrength] = useState(0);

    const load = async () => {
        try {
            const [p, y, s, r, c] = await Promise.all([
                api.get('/programs'), 
                api.get('/academicyears'),
                api.get('/sections'), 
                api.get('/rooms'), 
                api.get('/courses')
            ]);
            
            const sortedYears = (y.data || []).sort((a,b) => a.yearNumber - b.yearNumber);
            
            setPrograms(p.data); 
            setAcademicYears(sortedYears);
            setSections(s.data); 
            setRooms(r.data); 
            setCourses(c.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        setSForm(prev => ({ ...prev, yearId: '' }));
    }, [sFilters.programId]);

    const addEntity = async (entity, data, resetFn) => {
        setMsg('');
        try {
            await api.post(`/${entity}`, data);
            setMsg(`${entity} created successfully.`);
            resetFn();
            load();
        } catch (err) {
            setMsg(err.response?.data?.error || `Failed to create ${entity}`);
        }
    };

    const updateSectionStrength = async (id) => {
        try {
            await api.put(`/sections/${id}`, { strength: editStrength });
            setMsg('Strength updated.');
            setEditSecId(null);
            load();
        } catch (err) {
            setMsg(err.response?.data?.error || 'Update failed');
        }
    };

    const handleSessionCountChange = (type, count) => {
        const total = type === 'theory' ? cForm.theoryTotal : cForm.labTotal;
        const currentArr = type === 'theory' ? cForm.theorySessions : cForm.labSessions;
        const minRequired = total > 0 ? Math.ceil(total / 2) : 0;
        const maxAllowed = total;
        setSlotErrors(prev => ({ ...prev, [type]: '' }));
        if (count < minRequired && count !== 0) setSlotErrors(prev => ({ ...prev, [type]: `Min: ${minRequired} required` }));
        else if (count > maxAllowed) setSlotErrors(prev => ({ ...prev, [type]: `Max: ${total} allowed` }));

        let newArr = [...currentArr];
        if (count >= minRequired && count <= maxAllowed) {
            const safeCount = Math.min(count, 20);
            if (safeCount > currentArr.length) {
                for (let i = currentArr.length; i < safeCount; i++) newArr.push(1);
            } else {
                newArr = newArr.slice(0, safeCount);
            }
        } else { newArr = []; }
        
        if (type === 'theory') setCForm({ ...cForm, theorySessions: newArr, theoryTotal: total });
        else setCForm({ ...cForm, labSessions: newArr, labTotal: total });
    };

    const updateSessionVal = (type, index, val) => {
        const newArr = type === 'theory' ? [...cForm.theorySessions] : [...cForm.labSessions];
        newArr[index] = Number(val);
        if (type === 'theory') setCForm({ ...cForm, theorySessions: newArr });
        else setCForm({ ...cForm, labSessions: newArr });
    };

    return (
        <div className="tab-content">
            {msg && <div className={`glass-panel form-msg ${msg.toLowerCase().includes('error') ? 'error-text' : ''}`} style={{ marginBottom: '1rem' }}>{msg}</div>}

            <div className="glass-panel" style={{ padding: '0.75rem', marginBottom: '1.5rem', opacity: 0.8, fontSize: '0.85rem' }}>
                <Info size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                <strong>Note:</strong> Academic Structure (Programs & Years) is immutable once created to ensure timetable stability.
            </div>

            {/* 1. Academic Structure (Atomic Setup) */}
            <div className="glass-panel entity-section" style={{ marginBottom: '1.5rem' }}>
                <h3>Academic Setup</h3>
                <div className="form-grid">
                    <div className="input-group">
                        <label className="input-label">Program Name</label>
                        <input className="input-field" placeholder="e.g. B.Tech Computer Science" value={pForm.name}
                            onChange={e => setPForm({ ...pForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Duration (Years)</label>
                        <input className="input-field" type="number" min="1" max="8" value={pForm.durationYears}
                            onChange={e => setPForm({ ...pForm, durationYears: Number(e.target.value) })} />
                    </div>
                    <button className="btn btn-primary" style={{ alignSelf: 'flex-end', height: '42px' }} 
                        onClick={() => addEntity('programs', pForm, () => setPForm({ name: '', durationYears: 4 }))}>
                        <Plus size={16} /> Create Program & Years
                    </button>
                </div>

                <div className="entity-chips" style={{ marginTop: '1.5rem' }}>
                    {programs.map(p => (
                        <div key={p._id} className="glass-panel" style={{ marginBottom: '0.5rem', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem' }}>
                                <strong>{p.name}</strong>
                                <span className="hint-text">{p.durationYears} Year Program</span>
                            </div>
                            <div style={{ padding: '0.75rem', paddingTop: 0, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {academicYears.filter(y => {
                                    const progId = typeof y.programId === 'object' ? y.programId?._id : y.programId;
                                    return progId === p._id;
                                }).map(y => (
                                    <span key={y._id} className="chip" style={{ cursor: 'default' }}>Year {y.yearNumber}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. Sections */}
            <div className="glass-panel entity-section" style={{ marginBottom: '1.5rem' }}>
                <h3>Sections</h3>
                <div className="form-grid">
                    <div className="input-group">
                        <label className="input-label">Select Program</label>
                        <select className="input-field" value={sFilters.programId} onChange={e => setSFilters({ programId: e.target.value })}>
                            <option value="">— Choose —</option>
                            {programs.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Select Year</label>
                        <select className="input-field" value={sForm.yearId} onChange={e => setSForm({ ...sForm, yearId: e.target.value })} disabled={!sFilters.programId}>
                            <option value="">— Choose —</option>
                            {academicYears.filter(y => {
                                const progId = typeof y.programId === 'object' ? y.programId?._id : y.programId;
                                return progId === sFilters.programId;
                            }).map(y => (
                                <option key={y._id} value={y._id}>Year {y.yearNumber}</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Section Name</label>
                        <input className="input-field" placeholder="Section A" value={sForm.name}
                            onChange={e => setSForm({ ...sForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Initial Strength</label>
                        <input className="input-field" type="number" value={sForm.strength}
                            onChange={e => setSForm({ ...sForm, strength: Number(e.target.value) })} />
                    </div>
                    <button className="btn btn-primary" style={{ gridColumn: '1 / -1' }} 
                        onClick={() => addEntity('sections', sForm, () => setSForm({ ...sForm, name: '', strength: 60 }))}>
                        <Plus size={16} /> Create Section
                    </button>
                </div>

                <div className="entity-chips" style={{ marginTop: '1.5rem' }}>
                    {sections.map(s => (
                        <div key={s._id} className="chip" style={{ display: 'block', padding: '1rem', marginBottom: '0.5rem', cursor: 'default' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span><strong>{s.yearId?.programId?.name}</strong> → Year {s.yearId?.yearNumber} → <strong>{s.name}</strong></span>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {editSecId === s._id ? (
                                        <>
                                            <input className="input-field" type="number" style={{ width: '70px', height: '30px' }} 
                                                value={editStrength} onChange={e => setEditStrength(Number(e.target.value))} autoFocus />
                                            <Check size={16} className="text-secondary" style={{ cursor: 'pointer' }} onClick={() => updateSectionStrength(s._id)} />
                                            <X size={16} className="error-text" style={{ cursor: 'pointer' }} onClick={() => setEditSecId(null)} />
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ color: 'var(--text-muted)' }}>{s.strength} students</span>
                                            <Edit2 size={14} className="hint-text" style={{ cursor: 'pointer' }} onClick={() => { setEditSecId(s._id); setEditStrength(s.strength); }} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Rooms */}
            <div className="glass-panel entity-section" style={{ marginBottom: '1.5rem' }}>
                <h3>Physical Rooms</h3>
                <div className="form-grid">
                    <div className="input-group">
                        <label className="input-label">Room Name</label>
                        <input className="input-field" placeholder="R101" value={rForm.name}
                            onChange={e => setRForm({ ...rForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Type</label>
                        <select className="input-field" value={rForm.type} onChange={e => setRForm({ ...rForm, type: e.target.value })}>
                            <option value="classroom">Lecture Hall</option>
                            <option value="lab">Laboratory</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Capacity</label>
                        <input className="input-field" type="number" value={rForm.capacity}
                            onChange={e => setRForm({ ...rForm, capacity: Number(e.target.value) })} />
                    </div>
                    <button className="btn btn-primary" onClick={() => 
                        addEntity('rooms', rForm, () => setRForm({ name: '', type: 'classroom', capacity: 60 }))}>
                        <Plus size={16} /> Add Room
                    </button>
                </div>
            </div>
            
            {/* 4. Course Builder (CRUD allowed) */}
            <div className="glass-panel entity-section" style={{ marginTop: '1.5rem' }}>
                <h3>Course Planning</h3>
                <div className="form-grid">
                     <div className="input-group">
                        <label className="input-label">Course Name</label>
                        <input className="input-field" placeholder="Algorithms" value={cForm.name}
                            onChange={e => setCForm({ ...cForm, name: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Code</label>
                        <input className="input-field" placeholder="CS101" value={cForm.code}
                            onChange={e => setCForm({ ...cForm, code: e.target.value })} />
                    </div>

                    <div className="glass-panel" style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Theory Split</h4>
                        <div className="form-row" style={{ alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ width: '100px' }}>
                                <label className="input-label">Total Hrs</label>
                                <input className="input-field" type="number" value={cForm.theoryTotal}
                                    onChange={e => setCForm({ ...cForm, theoryTotal: Number(e.target.value) })} />
                            </div>
                            <div className="input-group" style={{ width: '100px' }}>
                                <label className="input-label">Slots</label>
                                <input className="input-field" type="number" min={Math.ceil(cForm.theoryTotal/2)} max={cForm.theoryTotal} value={cForm.theorySessions.length}
                                    onChange={e => handleSessionCountChange('theory', Number(e.target.value))} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {cForm.theorySessions.map((d, i) => (
                                    <input key={i} className="input-field" style={{ width: '60px' }} type="number" value={d}
                                        onChange={e => updateSessionVal('theory', i, e.target.value)} />
                                ))}
                            </div>
                            {slotErrors.theory && <div className="error-text" style={{ fontSize: '0.7rem' }}>{slotErrors.theory}</div>}
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ gridColumn: '1 / -1' }} onClick={() => addEntity('courses', cForm, () => setCForm({ name: '', code: '', theoryTotal: 3, theorySessions: [2, 1], labTotal: 0, labSessions: [] }))}>
                        Create Unified Course
                    </button>
                </div>
            </div>
        </div>
    );
};
