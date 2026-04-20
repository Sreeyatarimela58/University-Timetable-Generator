import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../api/client';
import { PreviewGrid } from '../PreviewGrid';
import './SolverTab.css'; // Import the new custom CSS module

const percent = (val) => `${((val || 0) * 100).toFixed(0)}%`;



const AnalyticsPanel = ({ draft, onPublish, index, published }) => {
    if (!draft) return null;
    const { summary, systemHealth, analytics } = draft;

    return (
        <aside className="st-analytics">
            <div className="st-panel" style={{padding: '32px 24px'}}>
                <div className="st-panel-header">
                    <h2 className="st-panel-title">Analytics</h2>
                    <div className="st-health-pill">
                        <span className={`st-pulse-dot ${systemHealth.status === "healthy" ? 'primary' : 'error'}`} 
                              style={{display: systemHealth.status !== 'healthy' && systemHealth.status !== 'strained' ? 'none' : 'block'}}></span>
                        {systemHealth.status.replace('_', ' ')}
                    </div>
                </div>

                <div className="st-stats-grid">
                    <div className="st-stat-box">
                        <span className="st-stat-label">Confidence</span>
                        <div className="st-stat-val">{percent(summary.confidence)}</div>
                        <div className="st-stat-bar-bg">
                            <div className="st-stat-bar-fill" style={{ width: percent(summary.confidence) }}></div>
                        </div>
                    </div>
                    <div className="st-stat-box">
                        <span className="st-stat-label">Space Util.</span>
                        <div className="st-stat-val">{percent(analytics?.spaceUtilization || 0)}</div>
                        <div className="st-stat-bar-bg">
                            <div className="st-stat-bar-fill" style={{ width: percent(analytics?.spaceUtilization || 0) }}></div>
                        </div>
                    </div>
                </div>

                {analytics?.failureSummary && Object.keys(analytics.failureSummary).length > 0 && (
                    <div style={{marginBottom: '32px'}}>
                        <h3 className="st-diag-title">Diagnostics</h3>
                        <div className="st-diag-list" style={{marginBottom: '0'}}>
                            {Object.entries(analytics.failureSummary).map(([k, v]) => (
                                <div key={k} className={`st-diag-item ${v > 0 ? 'error' : 'safe'}`}>
                                    <div className="st-diag-key">
                                        <span className="material-symbols-outlined">{v > 0 ? 'priority_high' : 'check'}</span>
                                        {k.replace(/([A-Z])/g, ' $1').trim()}
                                    </div>
                                    <span className="st-diag-val">{v} ISSUES</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {draft.unscheduled && draft.unscheduled.length > 0 && (
                    <div style={{flex: 1}}>
                        <h3 className="st-diag-title">Mitigations</h3>
                        <div className="st-diag-list">
                            {draft.unscheduled.slice(0, 3).map((item, i) => (
                                <div key={i} className="st-diag-item safe" style={{borderLeft: 'none', alignItems: 'flex-start', padding: 0, gap: '16px', backgroundColor: 'transparent'}}>
                                    <div style={{width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--st-surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                                        <span className="material-symbols-outlined" style={{fontSize: '16px'}}>psychology</span>
                                    </div>
                                    <div>
                                        <h4 style={{fontSize: '12px', fontWeight: 700, margin: '0 0 4px'}}>{item.reason}</h4>
                                        <p style={{fontSize: '10px', color: 'var(--st-secondary)', margin: 0, lineHeight: 1.4}}>
                                            {item.suggestion?.primary || `Review ${item.courseName} constraints.`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button 
                    onClick={onPublish} 
                    disabled={published}
                    className={`st-btn ${published ? 'st-btn-success' : 'st-btn-dark'}`} 
                    style={{width: '100%', marginTop: 'auto', padding: '20px'}}
                >
                    <span className="material-symbols-outlined">{published ? 'verified' : 'task_alt'}</span>
                    {published ? `Route ${String.fromCharCode(65 + index)} Published` : `Finalize Map ${String.fromCharCode(65 + index)}`}
                </button>
            </div>
        </aside>
    );
};

export const SolverTab = () => {
    const {
        generating, setGenerating,
        activeGeneration, setActiveGeneration,
        pendingDraftState, setPendingDraftState,
        drafts, setDrafts,
        draftId, setDraftId,
        selectedDraft, setSelectedDraft,
        selectedIndex, setSelectedIndex,
        programs, setPrograms,
        years, setYears
    } = useOutletContext();

    const [error, setError] = useState('');
    const [publishMsg, setPublishMsg] = useState('');
    const [published, setPublished] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // Filter/Selection local state
    const [targetProgram, setTargetProgram] = useState('');
    const [targetYear, setTargetYear] = useState('');
    const [mode, setMode] = useState("isolated");
    const [viewProgram, setViewProgram] = useState('');
    const [viewYear, setViewYear] = useState('');
    const [activeSectionId, setActiveSectionId] = useState(undefined);

    // Filter years to only those belonging to the selected program (now with memoized sorting)
    const filteredYears = useMemo(() => {
        if (!targetProgram) return [];
        return years
            .filter(y => y.programId === targetProgram || y.programId?._id === targetProgram)
            .sort((a, b) => (Number(a.yearNumber) || 0) - (Number(b.yearNumber) || 0));
    }, [years, targetProgram]);

    useEffect(() => {
        const fetchFilters = async () => {
            // Only fetch if context is empty to avoid redundant network calls on tab switch
            if (programs.length > 0 && years.length > 0) {
                if (!targetProgram && programs.length > 0) setTargetProgram(programs[0]._id);
                return;
            }

            try {
                const [progRes, yearRes, genRes, pendingRes] = await Promise.all([
                    api.get('/programs'),
                    api.get('/academicyears'),
                    api.get('/generation/active'),
                    api.get('/drafts/pending/summary')
                ]);
                setPrograms(progRes.data);
                // Sort at the source level for global consistency
                const sorted = (yearRes.data || []).sort((a, b) => (Number(a.yearNumber) || 0) - (Number(b.yearNumber) || 0));
                setYears(sorted);
                setActiveGeneration(genRes.data);
                setPendingDraftState(pendingRes.data);
                if (progRes.data.length > 0) setTargetProgram(progRes.data[0]._id);
            } catch (err) {
                console.error("Failed to fetch context scopes:", err);
                setError('Failed to load university context.');
            }
        };
        fetchFilters();
    }, [programs.length, years.length, setPrograms, setYears, setActiveGeneration, setPendingDraftState, targetProgram]);

    const handleLoadPending = async () => {
        if (!pendingDraftState?.draftId) return;
        setGenerating(true);
        try {
            const id = pendingDraftState.draftId;
            setDraftId(id);
            const draftRes = await api.get(`/drafts/${id}`);
            const loadedDrafts = draftRes.data.drafts || [];
            setDrafts(loadedDrafts);
            if (loadedDrafts.length > 0) {
               setSelectedDraft(loadedDrafts[0]);
               setSelectedIndex(0);
            }
        } catch (err) {
            setError('Failed to load pending draft');
        } finally {
            setGenerating(false);
        }
    };

    const executeClearPending = async () => {
        setShowConfirmDelete(false);
        try {
            await api.delete('/drafts/pending/clear');
            setPendingDraftState({ hasPending: false });
            setDrafts([]);
            setDraftId(null);
            setSelectedDraft(null);
        } catch (err) {
            setError('Failed to clear pending drafts');
        }
    };

    const handleGenerate = async () => {
        if (mode === "isolated" && (!targetProgram || !targetYear)) {
            setError('Select a target bounding scope.');
            return;
        }

        setGenerating(true);
        setError('');
        setDraftId(null);
        setDrafts([]);
        setSelectedDraft(null);
        setSelectedIndex(null);
        setPublishMsg('');
        setPublished(false);
        try {
            const payload = mode === "global" ? { mode: "global" } : { programId: targetProgram, yearId: targetYear };
            const res = await api.post('/generate-drafts', payload);
            const id = res.data.draftId;
            setDraftId(id);
            const draftRes = await api.get(`/drafts/${id}`);
            
            let loadedDrafts = draftRes.data.drafts || [];
            setDrafts(loadedDrafts);
            if (loadedDrafts.length > 0) {
               setSelectedDraft(loadedDrafts[0]);
               setSelectedIndex(0);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Generation failed.');
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        let interval;
        if (draftId && drafts.length > 0) {
            const isPending = drafts.some(d => d.meta?.stabilityPending);
            if (isPending) {
                interval = setInterval(async () => {
                    try {
                        const res = await api.get(`/drafts/${draftId}`);
                        const fetchedDrafts = res.data.drafts || [];
                        setDrafts(prevDrafts => prevDrafts.map((d, i) => i === 0 && fetchedDrafts[0] ? fetchedDrafts[0] : d));
                        setSelectedDraft(prev => selectedIndex === 0 && fetchedDrafts[0] ? fetchedDrafts[0] : prev);
                    } catch (e) { }
                }, 3000);
            }
        }
        return () => clearInterval(interval);
    }, [draftId, drafts.length, selectedIndex]);



    const handlePublish = async () => {
        if (!selectedDraft || !draftId) return;
        setPublishMsg('');
        try {
            const payload = activeSectionId ? { sectionId: activeSectionId } : {};
            const res = await api.post(`/publish/${draftId}/0`, payload); 
            setPublishMsg(res.data.message || 'Section timetable published successfully!');
            setPublished(true);
            setTimeout(() => setPublishMsg(''), 5000);
        } catch (err) {
            setPublishMsg(err.response?.data?.error || 'Publish failed.');
        }
    };

    // Render Logic
    const isUnconfigured = !drafts.length && !generating && !pendingDraftState?.hasPending;
    const isPendingDrafts = !drafts.length && !generating && pendingDraftState?.hasPending;
    const isComputing = generating && !drafts.length;
    const isResult = drafts.length > 0 && selectedDraft;

    // Grouping & Mapping Logic
    const programMap = useMemo(() => {
        const map = {};
        programs.forEach(p => map[p._id] = p.name);
        return map;
    }, [programs]);

    const yearMap = useMemo(() => {
        const map = {};
        years.forEach(y => map[y._id] = y.yearNumber);
        return map;
    }, [years]);

    const groupedData = useMemo(() => {
        if (!selectedDraft?.timetable) return {};
        const grouped = {};
        selectedDraft.timetable.forEach(item => {
            const { programId, yearId, sectionId, sectionName } = item;
            if (!grouped[programId]) grouped[programId] = {};
            if (!grouped[programId][yearId]) grouped[programId][yearId] = {};
            if (!grouped[programId][yearId][sectionId]) {
                grouped[programId][yearId][sectionId] = { sectionName, entries: [] };
            }
            grouped[programId][yearId][sectionId].entries.push(item);
        });
        return grouped;
    }, [selectedDraft]);

    useEffect(() => {
        const progIds = Object.keys(groupedData);
        if (progIds.length > 0 && (!viewProgram || !groupedData[viewProgram])) {
            setViewProgram(progIds[0]);
        }
    }, [groupedData, viewProgram]);

    useEffect(() => {
        if (viewProgram && groupedData[viewProgram]) {
            const yearIds = Object.keys(groupedData[viewProgram]);
            if (yearIds.length > 0 && (!viewYear || !groupedData[viewProgram][viewYear])) {
                setViewYear(yearIds[0]);
            }
        }
    }, [groupedData, viewProgram, viewYear]);



    return (
        <div className="st-layout">

            {/* Error / Alert Banners */}
            <div className="st-alert-tray">
                {error && (
                    <div className="st-alert error">
                        <span className="material-symbols-outlined">error</span> {error}
                    </div>
                )}
                {publishMsg && (
                    <div className={`st-alert ${published ? 'success' : 'error'}`}>
                        <span className="material-symbols-outlined">{published ? 'check_circle' : 'error'}</span> {publishMsg}
                    </div>
                )}
            </div>

            {/* HEADER - Now Persistent */}
            <header className="st-header">
                <div>
                    <div className="st-brand-row">
                        <h1 className="st-title">Timetable Intelligence</h1>
                        <div className={`st-status-pill ${activeGeneration ? 'st-status-active' : 'st-status-error'}`}>
                            <span className={`st-pulse-dot ${activeGeneration ? 'primary' : 'error'}`}></span>
                            {activeGeneration ? activeGeneration.name : 'Unconfigured'}
                        </div>
                    </div>
                    <p className="st-desc">
                        {pendingDraftState?.hasPending 
                            ? "Warning: Uncleared draft configurations exist in the registry."
                            : drafts.length > 0 
                                ? "Algorithm execution complete. Review metrics and alternatives below."
                                : "System parameters initialized. Adjust scopes and initiate algorithmic generation."}
                    </p>
                </div>

                <div className="st-controls">
                    <div style={{ marginRight: "12px", display: "flex", alignItems: "center" }}>
                        <button onClick={() => setMode("isolated")} style={{ background: mode === "isolated" ? "#333" : "#ccc", color: "#fff", marginRight: "4px", border: "none", padding: "6px 12px", borderRadius: "12px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>Isolated</button>
                        <button onClick={() => setMode("global")} style={{ background: mode === "global" ? "#333" : "#ccc", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "12px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>Global</button>
                    </div>

                    <div className="st-select-wrapper">
                        <select className="st-select" value={targetProgram} disabled={mode === "global"} onChange={e => {
                            setTargetProgram(e.target.value);
                            setTargetYear(''); // reset year when program changes
                        }}>
                            <option value="" disabled>Select Program</option>
                            {programs.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <span className="st-select-arrow">▾</span>
                    </div>
                    <div className="st-select-wrapper">
                        <select className="st-select" value={targetYear} onChange={e => setTargetYear(e.target.value)} disabled={!targetProgram || mode === "global"}>
                            <option value="" disabled>Select Year</option>
                            {filteredYears.map(y => <option key={y._id} value={y._id}>{y.yearNumber} Year</option>)}
                        </select>
                        <span className="st-select-arrow">▾</span>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={generating || (mode === "isolated" && (!targetProgram || !targetYear))}
                        className="st-btn st-btn-primary"
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                    >
                        {generating ? (
                            <>
                                <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                                Initializing...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">auto_fix_high</span>
                                {drafts.length > 0 ? 'Regenerate' : 'Generate'}
                            </>
                        )}
                    </button>
                    
                    {(drafts.length > 0 || pendingDraftState?.hasPending) && (
                        <button onClick={() => setShowConfirmDelete(true)} className="st-btn st-btn-error" style={{ padding: '8px', minWidth: '40px' }} title="Clear Results">
                            <span className="material-symbols-outlined" style={{ margin: 0 }}>delete</span>
                        </button>
                    )}
                </div>
            </header>

            {/* VIEW 1: Awaiting Generation */}
            {isUnconfigured && (
                <section className="st-center-state">
                    <div className="st-center-box">
                        <div className="st-icon-wrapper">
                            <div className="st-icon-blur primary"></div>
                            <div className="st-icon-container">
                                <span className="material-symbols-outlined">bolt</span>
                            </div>
                        </div>
                        <h2 className="st-center-title">Awaiting Directive</h2>
                        <p className="st-center-desc">
                            Mode: {mode === "global" ? "Global (All Programs)" : "Isolated"}
                            <br/><br/>
                            Matrix primed for execution. Activate solver to resolve scheduling parameters.
                        </p>
                        <div className="st-btn-group">
                            <button 
                                onClick={handleGenerate} disabled={mode === "isolated" && (!targetProgram || !targetYear)}
                                className="st-btn st-btn-primary"
                            >
                                <span className="material-symbols-outlined">auto_fix_high</span>
                                Generate Algorithm
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* VIEW 1-B: Pending Drafts */}
            {isPendingDrafts && (
                <section className="st-center-state">
                    <div className="st-center-box">
                        <div className="st-icon-wrapper">
                            <div className="st-icon-blur error"></div>
                            <div className="st-icon-container error">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                        </div>
                        <h2 className="st-center-title">Pending Drafts Found</h2>
                        <p className="st-center-desc">
                           Unpublished options exist in memory. Inspect or clear to continue.
                        </p>
                        <div className="st-btn-group">
                            <button onClick={handleLoadPending} className="st-btn st-btn-dark">
                                <span className="material-symbols-outlined">visibility</span>
                                View Drafts
                            </button>
                            <button onClick={() => setShowConfirmDelete(true)} className="st-btn st-btn-error">
                                <span className="material-symbols-outlined">delete</span>
                                Discard
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* VIEW 2: Computing */}
            {isComputing && (
                <section className="st-center-state">
                    <div className="st-loading-bg"></div>
                    <div className="st-center-box">
                        <div className="st-icon-wrapper">
                            <div className="st-icon-blur primary"></div>
                            <div className="st-icon-container blue">
                                <span className="material-symbols-outlined">sync</span>
                            </div>
                        </div>
                        <h2 className="st-center-title">Computing Variables...</h2>
                        <p className="st-center-desc" style={{marginBottom: 0}}>
                            Transpiling matrix parameters. Please hold.
                        </p>
                        <div className="st-progress-area">
                            <div className="st-progress-bar">
                                <div className="st-progress-fill"></div>
                            </div>
                            <div className="st-metrics">
                                <div className="st-metric">
                                    <span>Entropy</span>
                                    <span>Calculations</span>
                                </div>
                                <div className="st-divider"></div>
                                <div className="st-metric">
                                    <span>Load</span>
                                    <span>Executing Logic</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* VIEW 3: Result Viewer */}
            {isResult && (
                <div className="st-viewer-layout">
                    <div className="st-content">
                        <div className="st-main-canvas" style={{ overflowY: 'auto' }}>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--st-outline)' }}>
                                <div className="st-select-wrapper">
                                    <select value={viewProgram} onChange={e => { setViewProgram(e.target.value); setViewYear(''); }} className="st-select" style={{ minWidth: '150px' }}>
                                        <option value="" disabled>Select Program</option>
                                        {Object.keys(groupedData).map(pid => <option key={pid} value={pid}>{programMap[pid] || pid}</option>)}
                                    </select>
                                    <span className="st-select-arrow">▾</span>
                                </div>
                                <div className="st-select-wrapper">
                                    <select value={viewYear} onChange={e => { setViewYear(e.target.value); }} className="st-select" disabled={!viewProgram} style={{ minWidth: '120px' }}>
                                        <option value="" disabled>Select Year</option>
                                        {viewProgram && Object.keys(groupedData[viewProgram] || {}).map(yid => <option key={yid} value={yid}>Year {yearMap[yid] || yid}</option>)}
                                    </select>
                                    <span className="st-select-arrow">▾</span>
                                </div>
                            </div>

                            {viewProgram && viewYear && groupedData[viewProgram]?.[viewYear] && (
                                <PreviewGrid 
                                    timetable={Object.values(groupedData[viewProgram][viewYear]).reduce((acc, sec) => acc.concat(sec.entries), [])} 
                                    title={`${programMap[viewProgram] || viewProgram} - Year ${yearMap[viewYear] || viewYear}`} 
                                    activeSectionId={activeSectionId}
                                    setActiveSectionId={setActiveSectionId}
                                />
                            )}
                        </div>
                        <AnalyticsPanel draft={selectedDraft} index={selectedIndex} onPublish={handlePublish} published={published} />
                    </div>

                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showConfirmDelete && (
                <div className="st-modal-overlay">
                    <div className="st-modal-content">
                        <div className="st-modal-header">
                            <h3 className="st-modal-title">Discard Drafts</h3>
                            <button className="st-icon-btn" onClick={() => setShowConfirmDelete(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="st-modal-body">
                            <p>Are you sure you want to discard all pending drafts? This action cannot be undone.</p>
                        </div>
                        <div className="st-modal-footer">
                            <button className="st-btn st-btn-dark" onClick={() => setShowConfirmDelete(false)}>Cancel</button>
                            <button className="st-btn st-btn-error" onClick={executeClearPending}>Discard</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
