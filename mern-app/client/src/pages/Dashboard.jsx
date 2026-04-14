import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export const Dashboard = () => {
    const tabs = [
        { path: 'overview',        label: 'Overview' },
        { path: 'infrastructure',  label: 'Infrastructure' },
        { path: 'courses',         label: 'Courses' },
        { path: 'users',           label: 'Faculty & Students' },
        { path: 'assignments',     label: 'Assignments' },
        { path: 'solver',          label: 'Solver' },
        { path: 'archives',        label: 'Archives' },
    ];

    return (
        <div className="page-content animate-in">
            {/* Nested route content renders here */}
            <div className="tab-content">
                <Outlet />
            </div>
        </div>
    );
};
