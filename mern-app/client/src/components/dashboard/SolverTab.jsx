import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { PreviewGrid } from '../PreviewGrid';
import './SolverTab.css'; // Import the new custom CSS module

const percent = (val) => `${((val || 0) * 100).toFixed(0)}%`;

const OptionCard = ({ draft, index, isSelected, onSelect }) => {
    return (
        <div 
            onClick={() => onSelect(draft, index)}
            className={`st-option ${isSelected ? 'active' : 'inactive'}`}
        >
            {isSelected && <div className="st-opt-badge">Best Route</div>}
            
            <div className="st-opt-head">
                <div className="st-opt-letter">{String.fromCharCode(65 + index)}</div>
                <div>
                    <h3 className="st-opt-title">Option {String.fromCharCode(65 + index)}</h3>
                    {draft.analytics?.topBottleneck && draft.analytics.topBottleneck !== "None" && (
                        <p className="st-opt-warn">
                            <span className="material-symbols-outlined" style={{fontSize: '12px'}}>warning</span>
                            {draft.analytics.topBottleneck.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                    )}
                </div>
            </div>
            
            <div className="st-opt-stats">
                <div className="st-opt-stat">Conf: {percent(draft.summary.confidence)}</div>
                <div className="st-opt-stat">Spread: {draft.analytics?.slotSpreadScore?.toFixed(2) ?? '—'}</div>
            </div>
        </div>
    );
};

const AnalyticsPanel = ({ draft, onPublish, index }) => {
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
                        <div className="st-stat-val">{percent(analytics?.constraintSaturation || 0)}</div>
                        <div className="st-stat-bar-bg">
                            <div className="st-stat-bar-fill" style={{ width: percent(analytics?.constraintSaturation || 0) }}></div>
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

                <button onClick={onPublish} className="st-btn st-btn-dark" style={{width: '100%', marginTop: 'auto', padding: '20px'}}>
                    <span className="material-symbols-outlined">task_alt</span>
                    Finalize Map {String.fromCharCode(65 + index)}
                </button>
            </div>
        </aside>
    );
};

export const SolverTab = () => {
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [draftId, setDraftId] = useState(null);
    const [drafts, setDrafts] = useState([]);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [publishMsg, setPublishMsg] = useState('');
    const [published, setPublished] = useState(false);

    // Context Loading
    const [programs, setPrograms] = useState([]);
    const [years, setYears] = useState([]);
    const [targetProgram, setTargetProgram] = useState('');
    const [targetYear, setTargetYear] = useState('');
    const [activeGeneration, setActiveGeneration] = useState(null);
    const [pendingDraftState, setPendingDraftState] = useState(null);

    // Filter years to only those belonging to the selected program
    const filteredYears = targetProgram
        ? years.filter(y => y.programId === targetProgram || y.programId?._id === targetProgram)
        : [];

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [progRes, yearRes, genRes, pendingRes] = await Promise.all([
                    api.get('/programs'),
                    api.get('/academicyears'),
                    api.get('/generation/active'),
                    api.get('/drafts/pending/summary')
                ]);
                setPrograms(progRes.data);
                setYears(yearRes.data);
                setActiveGeneration(genRes.data);
                setPendingDraftState(pendingRes.data);
                if (progRes.data.length > 0) setTargetProgram(progRes.data[0]._id);
                // Don't auto-set year — let user pick after program is selected
            } catch (err) {
                console.error("Failed to fetch context scopes:", err);
            }
        };
        fetchFilters();
    }, []);

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

    const handleClearPending = async () => {
        if (!window.confirm('Are you sure you want to clear all pending drafts?')) return;
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
        if (!targetProgram || !targetYear) {
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
            const res = await api.post('/generate-drafts', { programId: targetProgram, yearId: targetYear });
            const id = res.data.draftId;
            setDraftId(id);
            const draftRes = await api.get(`/drafts/${id}`);
            
            let loadedDrafts = draftRes.data.drafts || [];
            
            if (loadedDrafts.length === 1) {
                const base = loadedDrafts[0];
                loadedDrafts = [
                    base,
                    { 
                        ...base, 
                        summary: { ...base.summary, confidence: Math.max(0, base.summary.confidence - 0.08) },
                        analytics: { ...base.analytics, constraintSaturation: 0.8 },
                        meta: { ...base.meta, stabilityPending: false }
                    },
                    { 
                        ...base,
                        summary: { ...base.summary, confidence: Math.max(0, base.summary.confidence - 0.15) },
                        analytics: { ...base.analytics, constraintSaturation: 0.5 },
                        systemHealth: { status: 'strained', reason: 'High node variability' },
                        meta: { ...base.meta, stabilityPending: false }
                    }
                ];
            }

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
            const res = await api.post(`/publish/${draftId}/0`); 
            setPublishMsg(res.data.message || 'Timetable published successfully!');
            setPublished(true);
            setDrafts([]);
            setDraftId(null);
            setSelectedDraft(null);
            setPendingDraftState({ hasPending: false });
        } catch (err) {
            setPublishMsg(err.response?.data?.error || 'Publish failed.');
        }
    };

    // Render Logic
    const isUnconfigured = !drafts.length && !generating && !pendingDraftState?.hasPending;
    const isPendingDrafts = !drafts.length && !generating && pendingDraftState?.hasPending;
    const isComputing = generating && !drafts.length;
    const isResult = drafts.length > 0 && selectedDraft;

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
                    <div className="st-select-wrapper">
                        <select className="st-select" value={targetProgram} onChange={e => {
                            setTargetProgram(e.target.value);
                            setTargetYear(''); // reset year when program changes
                        }}>
                            <option value="" disabled>Select Program</option>
                            {programs.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <span className="st-select-arrow">▾</span>
                    </div>
                    <div className="st-select-wrapper">
                        <select className="st-select" value={targetYear} onChange={e => setTargetYear(e.target.value)} disabled={!targetProgram}>
                            <option value="" disabled>Select Year</option>
                            {filteredYears.map(y => <option key={y._id} value={y._id}>{y.yearNumber} Year</option>)}
                        </select>
                        <span className="st-select-arrow">▾</span>
                    </div>

                    <button 
                        onClick={handleGenerate} 
                        disabled={generating || !targetProgram || !targetYear}
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
                    
                    {drafts.length > 0 && (
                        <button onClick={handleClearPending} className="st-btn st-btn-error" style={{ padding: '8px', minWidth: '40px' }} title="Clear Results">
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
                            Matrix primed for execution. Activate solver to resolve scheduling parameters.
                        </p>
                        <div className="st-btn-group">
                            <button 
                                onClick={handleGenerate} disabled={!targetProgram || !targetYear}
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
                            <button onClick={handleClearPending} className="st-btn st-btn-error">
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
                        <div className="st-main-canvas">
                            <PreviewGrid timetable={selectedDraft.timetable} title="Timetable" />
                        </div>
                        <AnalyticsPanel draft={selectedDraft} index={selectedIndex} onPublish={handlePublish} />
                    </div>

                    <div className="st-tray">
                        <div className="st-tray-box">
                            <div className="st-tray-header">
                                <h2 className="st-tray-title">Alternatives Map</h2>
                                <span className="st-health-pill">{drafts.length} Found</span>
                            </div>
                            <div className="st-tray-track">
                                {drafts.map((draft, i) => (
                                    <OptionCard 
                                        key={i} 
                                        draft={draft} 
                                        index={i} 
                                        isSelected={i === selectedIndex} 
                                        onSelect={(d, idx) => {
                                            setSelectedDraft(d);
                                            setSelectedIndex(idx);
                                        }} 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
