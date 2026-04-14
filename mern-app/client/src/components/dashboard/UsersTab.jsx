import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { UserPlus, User, GraduationCap, BookOpen } from 'lucide-react';

export const UsersTab = () => {
    const [users,    setUsers]    = useState([]);
    const [sections, setSections] = useState([]);
    const [form, setForm] = useState({ username: '', name: '', password: '', role: 'student', sectionId: '', maxHoursPerWeek: 20 });
    const [msg, setMsg] = useState({ text: '', isError: false });

    const load = async () => {
        try {
            const [u, s] = await Promise.all([api.get('/users'), api.get('/sections')]);
            setUsers(u.data);
            setSections(s.data);
        } catch (e) { console.error(e); }
    };

    useEffect(() => { load(); }, []);

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
                sectionId:       form.sectionId || null,
                maxHoursPerWeek: form.maxHoursPerWeek,
            });
            showMsg('Profile and login account provisioned successfully.');
            setForm({ username: '', name: '', password: '', role: 'student', sectionId: '', maxHoursPerWeek: 20 });
            load();
        } catch (err) {
            showMsg(err.response?.data?.error || 'Failed to create profile', true);
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'start' }}>

            {/* Create Form */}
            <div className="section-panel">
                <div className="section-header">
                    <UserPlus size={20} color="var(--primary)" />
                    <h3 className="section-title">Create New Profile</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
                    Creates both the physical profile and login account. ID Number becomes the username.
                </p>

                {msg.text && (
                    <div className={`alert ${msg.isError ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '20px' }}>
                        {msg.text}
                    </div>
                )}

                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="input-group">
                        <label className="input-label">Full Name</label>
                        <input className="input-field" placeholder="Dr. Jane Smith" value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="input-group">
                        <label className="input-label">ID Number (Login Username)</label>
                        <input className="input-field" placeholder="e.g. CS2024001" value={form.username}
                            onChange={e => setForm({ ...form, username: e.target.value })} required />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Login Password</label>
                        <input className="input-field" type="password" placeholder="Minimum 8 characters" value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })} required />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Role</label>
                        <select className="input-field" value={form.role}
                            onChange={e => setForm({ ...form, role: e.target.value, sectionId: '' })}>
                            <option value="student">Student</option>
                            <option value="prof">Professor</option>
                        </select>
                    </div>

                    {form.role === 'student' && (
                        <div className="input-group">
                            <label className="input-label">Section Assignment</label>
                            <select className="input-field" value={form.sectionId}
                                onChange={e => setForm({ ...form, sectionId: e.target.value })}>
                                <option value="">— Optional —</option>
                                {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}

                    {form.role === 'prof' && (
                        <div className="input-group">
                            <label className="input-label">Max Teaching Hours / Week</label>
                            <input className="input-field" type="number" placeholder="20" min="1" max="40"
                                value={form.maxHoursPerWeek}
                                onChange={e => setForm({ ...form, maxHoursPerWeek: Number(e.target.value) })} required />
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '13px', borderRadius: '14px', marginTop: '4px' }}>
                        Create Profile & Account
                    </button>
                </form>
            </div>

            {/* Users List */}
            <div>
                <div className="section-header">
                    <h3 className="section-title" style={{ fontSize: '17px' }}>
                        Existing Accounts
                        <span style={{ marginLeft: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--secondary)' }}>
                            ({users.length})
                        </span>
                    </h3>
                </div>

                {users.length === 0 ? (
                    <div className="apple-card" style={{ padding: '48px', textAlign: 'center' }}>
                        <User size={32} color="var(--secondary)" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--secondary)', fontSize: '14px' }}>No accounts yet. Create the first profile.</p>
                    </div>
                ) : (
                    <div className="apple-card" style={{ overflow: 'hidden' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name / Username</th>
                                    <th>Role</th>
                                    <th>Profile ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const IconComponent = roleIcon[u.role] || User;
                                    const colors = roleColors[u.role] || roleColors.admin;
                                    return (
                                        <tr key={u._id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <IconComponent size={15} color={colors.color} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{u.name || u.username}</p>
                                                        {u.name && <p style={{ fontSize: '11px', color: 'var(--secondary)', marginTop: '1px' }}>{u.username}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="role-badge" style={{ background: colors.bg, color: colors.color }}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="mono">{u.profileId || '—'}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};
