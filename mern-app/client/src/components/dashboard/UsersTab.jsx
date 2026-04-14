import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Plus } from 'lucide-react';

export const UsersTab = () => {
    const [users, setUsers] = useState([]);
    const [sections, setSections] = useState([]);
    const [form, setForm] = useState({ username: '', name: '', password: '', role: 'student', sectionId: '', maxHoursPerWeek: 20 });
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
                sectionId: form.sectionId || null,
                maxHoursPerWeek: form.maxHoursPerWeek
            });
            setMsg('Profile and Login provisioned.');
            setForm({ username: '', name: '', password: '', role: 'student', sectionId: '', maxHoursPerWeek: 20 });
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
                            onChange={e => setForm({ ...form, sectionId: e.target.value })}>
                            <option value="">— Assign to Section (optional) —</option>
                            {sections.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    )}

                    {form.role === 'prof' && (
                        <input className="input-field" type="number" placeholder="Max Hrs/Week (default 20)" 
                            value={form.maxHoursPerWeek}
                            onChange={e => setForm({ ...form, maxHoursPerWeek: Number(e.target.value) })} required />
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
