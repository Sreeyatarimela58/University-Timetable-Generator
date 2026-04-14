import React from 'react';
import { Search, Bell, Settings, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopHeader({ title }) {
    const { user } = useAuth();

    return (
        <header className="app-header">
            {/* Left: title + search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>
                    {title || 'Uni TT Gen'}
                </span>
                <div className="header-search">
                    <Search size={16} />
                    <input type="text" placeholder="Search facilities..." />
                </div>
            </div>

            {/* Right: actions & profile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="btn btn-ghost btn-icon" aria-label="Notifications">
                    <Bell size={20} color="var(--secondary)" />
                </button>
                <button className="btn btn-ghost btn-icon" aria-label="Settings">
                    <Settings size={20} color="var(--secondary)" />
                </button>
                <div style={{ width: '1px', height: '24px', background: 'var(--outline)', margin: '0 4px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '20px', cursor: 'pointer' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: 'var(--primary-bg)', border: '1px solid rgba(0,102,204,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <User size={16} color="var(--primary)" />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--on-surface)' }}>
                            {user?.username || 'Admin'}
                        </p>
                        <p style={{ fontSize: '9px', fontWeight: 600, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {user?.role || 'Administrator'}
                        </p>
                    </div>
                </div>
            </div>
        </header>
    );
}
