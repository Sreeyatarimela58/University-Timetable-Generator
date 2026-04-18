import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const TopHeader = ({ title = 'University Timetable Portal' }) => {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <header className="app-header">
            <div className="header-left">
                <h1 className="header-title">{title}</h1>
            </div>

            <div className="header-right">
                <div className="user-profile">
                    <div className="user-avatar">
                        <User size={16} />
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user.name || user.username}</span>
                        <span className="user-role-badge">{user.role}</span>
                    </div>
                </div>
                
                <div className="header-divider" />

                <button 
                    onClick={logout}
                    className="logout-btn"
                    title="Sign Out"
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    );
};
