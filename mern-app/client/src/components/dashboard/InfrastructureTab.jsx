import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Plus, Info, Edit2, Check, X, Building2, Layers, DoorOpen, Users } from 'lucide-react';

export const InfrastructureTab = () => {
    // ── Management State ─────────────────────────────────────────
    const [programs,      setPrograms]      = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [sections,      setSections]      = useState([]);
    const [rooms,         setRooms]         = useState([]);
    const [msg,           setMsg]           = useState({ text: '', isError: false });

    // Internal sub-tabs for infrastructure management
    const [activeSubTab, setActiveSubTab]   = useState('programs');

    const [pForm, setPForm] = useState({ name: '', durationYears: 4 });
    const [sForm, setSForm] = useState({ yearId: '', name: '', strength: 60 });
    const [sFilters, setSFilters] = useState({ programId: '' });
    const [rForm, setRForm] = useState({ name: '', type: 'classroom', capacity: 60 });
    const [roomError,  setRoomError]  = useState('');

    const [editSecId,    setEditSecId]    = useState(null);
    const [editStrength, setEditStrength] = useState(0);

    const load = async () => {
        try {
            const [p, y, s, r] = await Promise.all([
                api.get('/programs'),
                api.get('/academicyears'),
                api.get('/sections'),
                api.get('/rooms'),
            ]);
            const sortedYears = (y.data || []).sort((a, b) => a.yearNumber - b.yearNumber);
            setPrograms(p.data);
            setAcademicYears(sortedYears);
            setSections(s.data);
            setRooms(r.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);
    useEffect(() => { setSForm(prev => ({ ...prev, yearId: '' })); }, [sFilters.programId]);

    const showMsg = (text, isError = false) => {
        setMsg({ text, isError });
        setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    };

    const addEntity = async (entity, data, resetFn) => {
        try {
            await api.post(`/${entity}`, data);
            showMsg(`${entity.charAt(0).toUpperCase() + entity.slice(1)} created successfully.`);
            resetFn();
            load();
        } catch (err) {
            showMsg(err.response?.data?.error || `Failed to create ${entity}`, true);
        }
    };

    const updateSectionStrength = async (id) => {
        try {
            await api.put(`/sections/${id}`, { strength: editStrength });
            showMsg('Strength updated.');
            setEditSecId(null);
            load();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Update failed', true);
        }
    };

    return (
        <div className="animate-in">
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <p className="page-eyebrow">Academic Management</p>
                <h2 className="page-title">Infrastructure Management</h2>
                <p className="page-subtitle">
                    Curate and configure the architectural backbone of the university with precision-built tools.
                </p>
            </div>

            {/* Global Message */}
            {msg.text && (
                <div className={`alert ${msg.isError ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '24px' }}>
                    {msg.text}
                </div>
            )}

            {/* Sub-Tab Bar — Keeping internal for secondary organization */}
            <div className="tab-bar">
                {[
                    { key: 'programs',  label: 'Program Builder' },
                    { key: 'sections',  label: 'Academic Hierarchy' },
                    { key: 'rooms',     label: 'Physical Infrastructure' },
                ].map(t => (
                    <button
                        key={t.key}
                        className={`tab-btn ${activeSubTab === t.key ? 'tab-active' : ''}`}
                        onClick={() => setActiveSubTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── 1. Program Builder ── */}
            {activeSubTab === 'programs' && (
                <section style={{ marginBottom: '60px' }}>
                    <div className="alert alert-info" style={{ marginBottom: '24px' }}>
                        <Info size={16} />
                        <span>Academic Structure (Programs & Years) is immutable once created to ensure timetable stability.</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '40px', alignItems: 'start' }}>
                        <div className="section-panel">
                            <div className="section-header">
                                <Building2 size={20} color="var(--primary)" />
                                <h3 className="section-title">Define Program</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div className="input-group">
                                    <label className="input-label">Program Name</label>
                                    <input
                                        className="input-field"
                                        placeholder="e.g. B.Tech Computer Science"
                                        value={pForm.name}
                                        onChange={e => setPForm({ ...pForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Duration (Years)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <input
                                            type="range" min="1" max="8" value={pForm.durationYears}
                                            onChange={e => setPForm({ ...pForm, durationYears: Number(e.target.value) })}
                                            style={{ flex: 1, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                        />
                                        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', minWidth: '24px' }}>
                                            {pForm.durationYears}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '14px', borderRadius: '14px' }}
                                    onClick={() => addEntity('programs', pForm, () => setPForm({ name: '', durationYears: 4 }))}
                                >
                                    CREATE PROGRAM
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="input-label" style={{ marginBottom: '20px', display: 'block' }}>Active Programs</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {programs.map(p => (
                                    <div key={p._id} className="apple-card" style={{ padding: '28px' }}>
                                        <h4 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>{p.name}</h4>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
                                            {academicYears.filter(y => (typeof y.programId === 'object' ? y.programId?._id : y.programId) === p._id).map(y => (
                                                <span key={y._id} className="chip chip-primary">Year {y.yearNumber}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── 2. Academic Hierarchy (Sections) ── */}
            {activeSubTab === 'sections' && (
                <section>
                    <div className="section-panel">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div className="section-header" style={{ marginBottom: 0 }}>
                                <Layers size={20} color="var(--primary)" />
                                <h3 className="section-title">Hierarchy Configuration</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <select className="input-field" style={{ width: 'auto' }} value={sFilters.programId} onChange={e => setSFilters({ programId: e.target.value })}>
                                    <option value="">All Programs</option>
                                    {programs.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                </select>
                                <select className="input-field" style={{ width: 'auto' }} value={sForm.yearId} onChange={e => setSForm({ ...sForm, yearId: e.target.value })} disabled={!sFilters.programId}>
                                    <option value="">Select Year</option>
                                    {academicYears.filter(y => (typeof y.programId === 'object' ? y.programId?._id : y.programId) === sFilters.programId).map(y => <option key={y._id} value={y._id}>Year {y.yearNumber}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'start' }}>
                            <div className="inner-panel">
                                <div className="input-group">
                                    <label className="input-label">Section Name</label>
                                    <input className="input-field" placeholder="Section A" value={sForm.name} onChange={e => setSForm({ ...sForm, name: e.target.value })} />
                                </div>
                                <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => addEntity('sections', sForm, () => setSForm({ ...sForm, name: '', strength: 60 }))}>
                                    ADD SECTION
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {sections.map(s => (
                                    <div key={s._id} className="item-card">
                                        <div>
                                            <p style={{ fontWeight: 700 }}>{s.name}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--secondary)' }}>{s.yearId?.programId?.name} · Year {s.yearId?.yearNumber}</p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span className="chip" style={{ fontSize: '10px' }}>{s.strength} Students</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── 3. Physical Infrastructure (Rooms) ── */}
            {activeSubTab === 'rooms' && (
                <section>
                    <div className="section-header">
                        <DoorOpen size={20} color="var(--primary)" />
                        <h3 className="section-title">Physical Infrastructure</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'start' }}>
                        <div className="apple-card" style={{ padding: '32px' }}>
                            <div className="input-group">
                                <label className="input-label">Room Label</label>
                                <input className="input-field" value={rForm.name} onChange={e => setRForm({ ...rForm, name: e.target.value })} />
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => addEntity('rooms', rForm, () => setRForm({ name: '', type: 'classroom', capacity: 60 }))}>
                                REGISTER FACILITY
                            </button>
                        </div>
                        <div className="room-grid">
                            {rooms.map(r => (
                                <div key={r._id} className="room-card">
                                    <div>
                                        <p className="room-type-label">{r.type}</p>
                                        <p className="room-name">{r.name}</p>
                                    </div>
                                    <div className="room-capacity">
                                        <Users size={14} />
                                        <span>{r.capacity}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
};
