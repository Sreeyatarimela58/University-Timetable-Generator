import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Building2, BookOpen, Users, Archive, HelpCircle, LogOut, Zap, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { icon: LayoutGrid,  label: 'Overview',          path: '/admin/overview' },
    { icon: Building2,   label: 'Infrastructure',    path: '/admin/infrastructure' },
    { icon: BookOpen,    label: 'Courses',           path: '/admin/courses' },
    { icon: Users,       label: 'Faculty & Students',path: '/admin/users' },
    { icon: LinkIcon,   label: 'Assignments',       path: '/admin/assignments' },
    { icon: Zap,        label: 'Solver',            path: '/admin/solver' },
    { icon: Archive,     label: 'Archives',          path: '/admin/archives' },
];

export default function Sidebar() {
    const { logout } = useAuth();

    return (
        <aside className="app-sidebar">
            {/* Brand */}
            <div className="sidebar-brand" style={{ padding: '4px 8px 16px' }}>
                <h1>Uni Admin</h1>
                <p>Precision Suite</p>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-footer-links">
                    <a href="#" className="nav-item" style={{ fontSize: '13px' }}>
                        <HelpCircle size={18} />
                        Help
                    </a>
                    <button
                        className="nav-item"
                        style={{ fontSize: '13px', color: 'var(--error)', cursor: 'pointer', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', padding: '12px 16px' }}
                        onClick={logout}
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </div>
        </aside>
    );
}
