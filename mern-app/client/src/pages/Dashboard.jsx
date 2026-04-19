import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export const Dashboard = () => {
    // Shared State for Persistence
    const [generating, setGenerating] = useState(false);
    const [activeGeneration, setActiveGeneration] = useState(null);
    const [pendingDraftState, setPendingDraftState] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [draftId, setDraftId] = useState(null);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);

    // Context Cache
    const [programs, setPrograms] = useState([]);
    const [years, setYears] = useState([]);

    const tabs = [
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
                <Outlet context={{
                    generating, setGenerating,
                    activeGeneration, setActiveGeneration,
                    pendingDraftState, setPendingDraftState,
                    drafts, setDrafts,
                    draftId, setDraftId,
                    selectedDraft, setSelectedDraft,
                    selectedIndex, setSelectedIndex,
                    programs, setPrograms,
                    years, setYears
                }} />
            </div>
        </div>
    );
};
