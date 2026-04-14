import React, { useState } from 'react';
import { Users, Database, Zap, Link } from 'lucide-react';
import { UsersTab } from '../components/dashboard/UsersTab';
import { InfrastructureTab } from '../components/dashboard/InfrastructureTab';
import { AssignmentsTab } from '../components/dashboard/AssignmentsTab';
import { GenerateTab } from '../components/dashboard/GenerateTab';

// ─── Main Dashboard Shell ───────────────────────────────────────
export const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('users');

    const tabs = [
        { key: 'users', label: 'Users', icon: <Users size={18} /> },
        { key: 'infrastructure', label: 'Infrastructure', icon: <Database size={18} /> },
        { key: 'assignments', label: 'Assignments', icon: <Link size={18} /> },
        { key: 'generate', label: 'Generate Drafts', icon: <Zap size={18} /> }
    ];

    return (
        <div>
            {/* Tab Bar */}
            <div className="tab-bar">
                {tabs.map(t => (
                    <button key={t.key}
                        className={`tab-btn ${activeTab === t.key ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab(t.key)}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'infrastructure' && <InfrastructureTab />}
            {activeTab === 'assignments' && <AssignmentsTab />}
            {activeTab === 'generate' && <GenerateTab />}
        </div>
    );
};
