import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Plus, X } from 'lucide-react';

export const CoursesTab = () => {
    const [courses, setCourses] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [msg, setMsg] = useState({ text: '', isError: false });
    const [cForm, setCForm] = useState({ 
        programId: '', 
        yearId: '', 
        name: '', 
        code: '', 
        theoryTotal: 3, 
        theorySessions: [2, 1], 
        labTotal: 0, 
        labSessions: [] 
    });
    const [slotErrors, setSlotErrors] = useState({ theory: '', lab: '' });

    const load = async () => {
        try {
            const [c, p, y] = await Promise.all([
                api.get('/courses'),
                api.get('/programs'),
                api.get('/academicyears')
            ]);
            setCourses(c.data);
            setPrograms(p.data);
            setAcademicYears(y.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

    // Helper to get years for selected program
    const filteredYears = academicYears.filter(y => {
        const pId = typeof y.programId === 'object' ? y.programId?._id : y.programId;
        return pId === cForm.programId;
    }).sort((a,b) => a.yearNumber - b.yearNumber);

    // Filtered courses for display
    const filteredCourses = courses.filter(c => c.yearId === cForm.yearId || (typeof c.yearId === 'object' && c.yearId?._id === cForm.yearId));

    const showMsg = (text, isError = false) => {
        setMsg({ text, isError });
        setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    };

    const handleSessionCountChange = (type, count) => {
        const total = type === 'theory' ? cForm.theoryTotal : cForm.labTotal;
        const currentArr = type === 'theory' ? cForm.theorySessions : cForm.labSessions;
        const minRequired = total > 0 ? Math.ceil(total / 2) : 0;
        const maxAllowed = total;
        
        setSlotErrors(prev => ({ ...prev, [type]: '' }));
        if (count < minRequired && count !== 0)
            setSlotErrors(prev => ({ ...prev, [type]: `Min: ${minRequired} required` }));
        else if (count > maxAllowed)
            setSlotErrors(prev => ({ ...prev, [type]: `Max: ${total} allowed` }));

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
        else                   setCForm({ ...cForm, labSessions:    newArr, labTotal:    total });
    };

    const updateSessionVal = (type, index, val) => {
        const newArr = type === 'theory' ? [...cForm.theorySessions] : [...cForm.labSessions];
        newArr[index] = Number(val);
        if (type === 'theory') setCForm({ ...cForm, theorySessions: newArr });
        else                   setCForm({ ...cForm, labSessions:    newArr });
    };

    const addCourse = async () => {
        if (!cForm.programId || !cForm.yearId || !cForm.name || !cForm.code) {
            return showMsg('Please complete all identification fields (Program, Year, Name, Code).', true);
        }

        try {
            await api.post('/courses', cForm);
            showMsg('Course structure finalized.');
            setCForm({ ...cForm, name: '', code: '', theoryTotal: 3, theorySessions: [2, 1], labTotal: 0, labSessions: [] });
            load();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to create course', true);
        }
    };

    return (
        <div className="animate-in">
            {/* Page label */}
            <header style={{ marginBottom: '48px' }}>
                <span className="page-eyebrow">Curriculum Architect</span>
                <h2 className="page-title">Unified Course Planning</h2>
            </header>

            {msg.text && (
                <div className={`alert ${msg.isError ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '24px' }}>
                    {msg.text}
                </div>
            )}

            <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* Hierarchy & Identity */}
                <div className="apple-card" style={{ padding: '28px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        <div className="input-group">
                            <label className="input-label">Program</label>
                            <select 
                                className="input-field"
                                value={cForm.programId}
                                onChange={e => setCForm({ ...cForm, programId: e.target.value, yearId: '' })}
                            >
                                <option value="">Select Program</option>
                                {programs.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Academic Year</label>
                            <select 
                                className="input-field"
                                value={cForm.yearId}
                                onChange={e => setCForm({ ...cForm, yearId: e.target.value })}
                                disabled={!cForm.programId}
                            >
                                <option value="">Select Year</option>
                                {filteredYears.map(y => <option key={y._id} value={y._id}>Year {y.yearNumber}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px' }}>
                        <div className="input-group">
                            <label className="input-label">Course Identification Name</label>
                            <input
                                className="input-field"
                                placeholder="e.g. Advanced Computational Fluid Dynamics"
                                style={{ fontSize: '18px', fontWeight: 500, padding: '16px' }}
                                value={cForm.name}
                                onChange={e => setCForm({ ...cForm, name: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Catalog Code</label>
                            <input
                                className="input-field"
                                placeholder="CS-401"
                                style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', padding: '16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                                value={cForm.code}
                                onChange={e => setCForm({ ...cForm, code: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Theory + Lab split — side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* Theory Split */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Theory Split</h3>
                            <span className="chip chip-primary">Calculated Logic</span>
                        </div>
                        <div className="split-panel">
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '28px' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Total Theory Hrs</label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        style={{ fontSize: '2rem', fontWeight: 700, padding: '12px' }}
                                        value={cForm.theoryTotal}
                                        onChange={e => setCForm({ ...cForm, theoryTotal: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Slots / Week</label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        min={cForm.theoryTotal > 0 ? Math.ceil(cForm.theoryTotal / 2) : 0}
                                        max={cForm.theoryTotal}
                                        value={cForm.theorySessions.length}
                                        onChange={e => handleSessionCountChange('theory', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <label className="input-label" style={{ marginBottom: '12px', display: 'block' }}>
                                Slot Duration Breakdown (hrs)
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                {cForm.theorySessions.map((d, i) => (
                                    <div key={i} className="slot-box">
                                        <span style={{ fontSize: '11px', color: 'var(--secondary)', marginBottom: '4px' }}>Slot {String.fromCharCode(65 + i)}</span>
                                        <input
                                            type="number"
                                            value={d}
                                            onChange={e => updateSessionVal('theory', i, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                            {slotErrors.theory && (
                                <div className="alert alert-error" style={{ marginTop: '12px', padding: '8px 12px', fontSize: '12px' }}>
                                    {slotErrors.theory}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Lab Split */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Lab Split</h3>
                            <span className="chip">Practical Allocation</span>
                        </div>
                        <div className="split-panel">
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '28px' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Total Lab Hrs</label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        style={{ fontSize: '2rem', fontWeight: 700, padding: '12px' }}
                                        value={cForm.labTotal}
                                        onChange={e => setCForm({ ...cForm, labTotal: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label className="input-label">Slots / Week</label>
                                    <input
                                        className="input-field"
                                        type="number"
                                        min={cForm.labTotal > 0 ? Math.ceil(cForm.labTotal / 2) : 0}
                                        max={cForm.labTotal}
                                        value={cForm.labSessions.length}
                                        onChange={e => handleSessionCountChange('lab', Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <label className="input-label" style={{ marginBottom: '12px', display: 'block' }}>
                                Slot Duration Breakdown (hrs)
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {cForm.labSessions.length === 0 && (
                                    <div className="slot-box" style={{ opacity: 0.4, gridColumn: '1/-1' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--secondary)' }}>No Lab Slots</span>
                                        <input type="text" disabled value="0h" style={{ color: 'var(--secondary)' }} />
                                    </div>
                                )}
                                {cForm.labSessions.map((d, i) => (
                                    <div key={i} className="slot-box">
                                        <span style={{ fontSize: '11px', color: 'var(--secondary)', marginBottom: '4px' }}>
                                            {i === 0 ? 'Primary Lab' : 'Secondary Lab'}
                                        </span>
                                        <input
                                            type="number"
                                            value={d}
                                            onChange={e => updateSessionVal('lab', i, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                            {slotErrors.lab && (
                                <div className="alert alert-error" style={{ marginTop: '12px', padding: '8px 12px', fontSize: '12px' }}>
                                    {slotErrors.lab}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className="btn btn-ghost"
                            onClick={() => setCForm({ ...cForm, name: '', code: '', theoryTotal: 3, theorySessions: [2, 1], labTotal: 0, labSessions: [] })}
                        >
                            <X size={16} /> Discard
                        </button>
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ padding: '14px 36px', fontSize: '16px', borderRadius: '18px', boxShadow: '0 8px 20px rgba(0,102,204,0.2)' }}
                        onClick={addCourse}
                    >
                        Finalize Course Structure
                    </button>
                </div>

                {/* Existing Courses Summary */}
                {cForm.yearId && (
                    <div style={{ marginTop: '40px' }}>
                        <label className="input-label" style={{ marginBottom: '16px', display: 'block' }}>
                            Courses in Selected Year ({filteredCourses.length})
                        </label>
                        {filteredCourses.length === 0 ? (
                            <div className="apple-card" style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
                                <p>No courses registered for this academic year yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                                {filteredCourses.map(c => (
                                    <div key={c._id} className="apple-card" style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                {c.code}
                                            </span>
                                        </div>
                                        <p style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</p>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            {c.theoryTotal > 0 && <span className="chip chip-primary">Theory: {c.theoryTotal}h</span>}
                                            {c.labTotal > 0   && <span className="chip">Lab: {c.labTotal}h</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
