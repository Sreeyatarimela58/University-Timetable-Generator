import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { UserPlus, User, GraduationCap, BookOpen } from 'lucide-react';

export const UsersTab = () => {
    const [users,    setUsers]    = useState([]);
    const [sections, setSections] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [years,    setYears]    = useState([]);
    
    const [form, setForm] = useState({ 
        username: '', 
        name: '', 
        password: '', 
        role: 'student', 
        programId: '',
        yearId: '',
        sectionId: '', 
        specialization: 'CSE',
        maxHoursPerWeek: 20 
    });
    
    const [msg, setMsg] = useState({ text: '', isError: false });

    const [currentPage, setCurrentPage] = useState(1);
    const [listTab, setCurrentListTab] = useState('student'); // 'student', 'prof'
    const ITEMS_PER_PAGE = 15;

    const loadData = async () => {
        try {
            const [u, s, p, y] = await Promise.all([
                api.get('/users'), 
                api.get('/sections'),
                api.get('/programs'),
                api.get('/academicyears')
            ]);
            setUsers(u.data);
            setSections(s.data);
            setPrograms(p.data);
            setYears(y.data);
            // Reset to page 1 on load/refresh if needed
        } catch (e) { console.error(e); }
    };

    useEffect(() => { loadData(); }, []);

    // Pagination & Filtering Logic
    const filteredUsersList = users.filter(u => u.role === listTab);
    const totalPages = Math.ceil(filteredUsersList.length / ITEMS_PER_PAGE);
    const displayedUsers = filteredUsersList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    // Reset current page if it's beyond total pages or when tab changes
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [filteredUsersList.length, totalPages, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [listTab]);

    // Dependent filtering
    const filteredYears = form.programId 
        ? years.filter(y => (y.programId === form.programId || y.programId?._id === form.programId))
               .sort((a, b) => (Number(a.yearNumber) || 0) - (Number(b.yearNumber) || 0))
        : [];
    
    const filteredSections = form.programId && form.yearId
        ? sections.filter(s => 
            (s.programId === form.programId || s.programId?._id === form.programId) && 
            (s.yearId === form.yearId || s.yearId?._id === form.yearId)
          )
        : [];

    const showMsg = (text, isError = false) => {
        setMsg({ text, isError });
        setTimeout(() => setMsg({ text: '', isError: false }), 4000);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/users', {
                username: form.username,
                name:     form.name,
                password: form.password,
                role:     form.role,
                sectionId:       form.role === 'student' ? (form.sectionId || null) : null,
                specialization:  form.role === 'prof' ? form.specialization : null,
                maxHoursPerWeek: form.maxHoursPerWeek,
            });
            showMsg('Profile and login account provisioned successfully.');
            setForm({ 
                username: '', 
                name: '', 
                password: '', 
                role: 'student', 
                programId: '',
                yearId: '',
                sectionId: '', 
                specialization: 'CSE',
                maxHoursPerWeek: 20 
            });
            loadData();
            setCurrentPage(1); // Go to first page to see the new entry (or last page if sorted by date)
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to create profile', true);
        }
    };

    const [jumpPage, setJumpPage] = useState(1);

    useEffect(() => {
        setJumpPage(currentPage);
    }, [currentPage]);

    const handleJump = (e) => {
        if (e.key === 'Enter' || e.type === 'blur') {
            const val = Number(jumpPage);
            if (!isNaN(val) && val >= 1 && val <= totalPages) {
                setCurrentPage(val);
            } else {
                setJumpPage(currentPage); // Reset on invalid
            }
        }
    };

    const roleIcon = { student: GraduationCap, prof: BookOpen, admin: User };
    const roleColors = { student: { color: '#34c759', bg: 'rgba(52,199,89,0.08)' }, prof: { color: '#ff9500', bg: 'rgba(255,149,0,0.08)' }, admin: { color: 'var(--primary)', bg: 'var(--primary-bg)' } };

    return (
        <div className="animate-in">
            {/* Page Header */}
            <div style={{ marginBottom: '32px' }}>
                <p className="page-eyebrow">Academic Directory</p>
                <h2 className="page-title">Faculty & Student Directory</h2>
                <p className="page-subtitle">
                    Manage profiles, teaching loads, and section assignments for the university population.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* Create Form - Now Horizontal */}
            <div className="section-panel" style={{ padding: '24px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div className="section-header" style={{ marginBottom: 0 }}>
                        <UserPlus size={20} color="var(--primary)" />
                        <h3 className="section-title">Provision New Profile</h3>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary)', display: 'flex', gap: '16px' }}>
                        <span>• ID Number is Username</span>
                        <span>• Default password required</span>
                    </div>
                </div>

                {msg.text && (
                    <div className={`alert ${msg.isError ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '20px' }}>
                        {msg.text}
                    </div>
                )}

                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Identity Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                        <div className="input-group">
                            <label className="input-label">Full Name</label>
                            <input className="input-field" placeholder="Dr. Jane Smith" value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="input-group">
                            <label className="input-label">ID Number / Username</label>
                            <input className="input-field" placeholder="e.g. CS2024001" value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })} required />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Login Password</label>
                            <input className="input-field" type="password" placeholder="Min 8 characters" value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })} required />
                        </div>
                    </div>

                    <div style={{ height: '1px', background: 'var(--outline)', opacity: 0.5 }}></div>

                    {/* Configuration Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', alignItems: 'end' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', flex: 1 }}>
                            <div className="input-group">
                                <label className="input-label">Role</label>
                                <select className="input-field" value={form.role}
                                    onChange={e => setForm({ ...form, role: e.target.value, programId: '', yearId: '', sectionId: '', specialization: 'CSE' })}>
                                    <option value="student">Student</option>
                                    <option value="prof">Professor</option>
                                </select>
                            </div>

                            {form.role === 'student' && (
                                <>
                                    <div className="input-group">
                                        <label className="input-label">Program</label>
                                        <select className="input-field" value={form.programId}
                                            onChange={e => setForm({ ...form, programId: e.target.value, yearId: '', sectionId: '' })} required>
                                            <option value="">— Select —</option>
                                            {programs.map(p => <option key={p._id} value={p._id}>{p.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Year</label>
                                        <select className="input-field" value={form.yearId}
                                            onChange={e => setForm({ ...form, yearId: e.target.value, sectionId: '' })} 
                                            disabled={!form.programId} required>
                                            <option value="">— Select —</option>
                                            {filteredYears.map(y => <option key={y._id} value={y._id}>{y.yearNumber} Year</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Section</label>
                                        <select className="input-field" value={form.sectionId}
                                            onChange={e => setForm({ ...form, sectionId: e.target.value })}
                                            disabled={!form.yearId} required>
                                            <option value="">— Select —</option>
                                            {filteredSections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}

                            {form.role === 'prof' && (
                                <>
                                    <div className="input-group">
                                        <label className="input-label">Specialization</label>
                                        <select className="input-field" value={form.specialization}
                                            onChange={e => setForm({ ...form, specialization: e.target.value })} required>
                                            <option value="CSE">CSE</option>
                                            <option value="ECE">ECE</option>
                                            <option value="MBA">MBA</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Max Hours / Week</label>
                                        <input className="input-field" type="number" placeholder="20" min="1" max="40"
                                            value={form.maxHoursPerWeek}
                                            onChange={e => setForm({ ...form, maxHoursPerWeek: Number(e.target.value) })} required />
                                    </div>
                                    {/* Spacers to keep layout consistent */}
                                    <div className="hidden md:block"></div>
                                </>
                            )}
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ height: '44px', padding: '0 32px', borderRadius: '12px' }}>
                            Grant Access
                        </button>
                    </div>
                </form>
            </div>

            {/* Users List - Below the card */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div className="section-header" style={{ marginBottom: 0 }}>
                        <h3 className="section-title" style={{ fontSize: '17px' }}>
                            Active Directory Accounts
                            <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--secondary)' }}>
                                ({filteredUsersList.length} shown)
                            </span>
                        </h3>
                    </div>

                    <div className="tab-bar" style={{ marginBottom: 0, gap: '20px', borderBottom: 'none' }}>
                        <button 
                            className={`tab-btn ${listTab === 'student' ? 'tab-active' : ''}`}
                            onClick={() => setCurrentListTab('student')}
                            style={{ padding: '0 0 8px', fontSize: '11px' }}
                        >
                            Students
                        </button>
                        <button 
                            className={`tab-btn ${listTab === 'prof' ? 'tab-active' : ''}`}
                            onClick={() => setCurrentListTab('prof')}
                            style={{ padding: '0 0 8px', fontSize: '11px' }}
                        >
                            Faculty
                        </button>
                    </div>
                </div>

                {users.length === 0 ? (
                    <div className="apple-card no-hover" style={{ padding: '64px', textAlign: 'center' }}>
                        <User size={32} color="var(--secondary)" style={{ margin: '0 auto 16px' }} />
                        <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>No accounts provisioned in the directory.</p>
                    </div>
                ) : (
                    <div className="apple-card no-hover" style={{ overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Identity</th>
                                    {listTab === 'student' && (
                                        <>
                                            <th>Roll Number</th>
                                            <th>Program & Year</th>
                                            <th>Section</th>
                                        </>
                                    )}
                                    {listTab === 'prof' && (
                                        <>
                                            <th>ID Number</th>
                                            <th>Specialization</th>
                                            <th>Load Limit</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {displayedUsers.map(u => {
                                    const IconComponent = roleIcon[u.role] || User;
                                    const colors = roleColors[u.role] || roleColors.admin;
                                    const profile = u.profileId || {};
                                    
                                    return (
                                        <tr key={u._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <IconComponent size={16} color={colors.color} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{profile.name || u.name || u.username}</p>
                                                        <p style={{ fontSize: '11px', color: 'var(--secondary)', marginTop: '1px' }}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)} Account</p>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {listTab === 'student' && (
                                                <>
                                                    <td><span className="mono">{u.username}</span></td>
                                                    <td>
                                                        <div style={{ fontSize: '12px' }}>
                                                            {profile.sectionId?.programId?.name?.toUpperCase() || '—'}
                                                            <p style={{ fontSize: '10px', color: 'var(--secondary)' }}>
                                                                {profile.sectionId?.yearId?.yearNumber ? `${profile.sectionId.yearId.yearNumber} Year` : 'Unassigned'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="role-badge" style={{ background: 'var(--surface-high)', color: 'var(--on-surface)' }}>
                                                            {profile.sectionId?.name || 'No Section'}
                                                        </span>
                                                    </td>
                                                </>
                                            )}

                                            {listTab === 'prof' && (
                                                <>
                                                    <td><span className="mono">{u.username}</span></td>
                                                    <td>
                                                        <span className="role-badge" style={{ background: 'rgba(52,152,219,0.1)', color: '#3498db' }}>
                                                            {profile.specialization || 'General'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontSize: '12px', fontWeight: 500 }}>{profile.maxHoursPerWeek || 20} hrs/wk</span>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div style={{ 
                                padding: '16px 24px', 
                                borderTop: '1px solid var(--outline)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: 'var(--surface-low)'
                            }}>
                                <p style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: 500 }}>
                                    Showing page <span style={{ color: 'var(--on-surface)', fontWeight: 600 }}>{currentPage}</span> of <span style={{ color: 'var(--on-surface)', fontWeight: 600 }}>{totalPages}</span>
                                </p>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </button>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {currentPage > 1 && (
                                            <button
                                                onClick={() => setCurrentPage(currentPage - 1)}
                                                style={{
                                                    width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                    background: 'transparent', color: 'var(--on-surface-variant)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {currentPage - 1}
                                            </button>
                                        )}

                                        <input
                                            type="number"
                                            value={jumpPage}
                                            onChange={(e) => setJumpPage(e.target.value)}
                                            onKeyDown={handleJump}
                                            onBlur={handleJump}
                                            style={{
                                                width: '36px',
                                                height: '28px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--primary)',
                                                background: 'var(--primary)',
                                                color: 'white',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                textAlign: 'center',
                                                outline: 'none',
                                                appearance: 'none',
                                                margin: '0 2px'
                                            }}
                                        />

                                        {currentPage < totalPages && (
                                            <button
                                                onClick={() => setCurrentPage(currentPage + 1)}
                                                style={{
                                                    width: '28px', height: '28px', borderRadius: '6px', border: 'none',
                                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                    background: 'transparent', color: 'var(--on-surface-variant)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {currentPage + 1}
                                            </button>
                                        )}
                                    </div>

                                    <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
