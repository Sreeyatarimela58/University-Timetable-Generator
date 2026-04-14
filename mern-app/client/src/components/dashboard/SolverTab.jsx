import React, { useState } from 'react';
import api from '../../api/client';
import { PreviewGrid } from '../PreviewGrid';
import { Zap, Eye, Send, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

export const SolverTab = () => {
    const [generating,  setGenerating]  = useState(false);
    const [error,       setError]       = useState('');
    const [draftId,     setDraftId]     = useState(null);
    const [drafts,      setDrafts]      = useState([]);
    const [selected,    setSelected]    = useState(null);
    const [publishMsg,  setPublishMsg]  = useState('');
    const [published,   setPublished]   = useState(false);

    const handleGenerate = async () => {
        setGenerating(true);
        setError('');
        setDraftId(null);
        setDrafts([]);
        setSelected(null);
        setPublishMsg('');
        setPublished(false);
        try {
            const res = await api.post('/generate-drafts');
            const id = res.data.draftId;
            setDraftId(id);
            const draftRes = await api.get(`/drafts/${id}`);
            setDrafts(draftRes.data.drafts || []);
        } catch (err) {
            if (err.response?.status === 423)
                setError('Another generation is already running. Please wait.');
            else if (err.response?.status === 400)
                setError(err.response.data.error || 'Missing timetable data. Configure Infrastructure and Assignments first.');
            else
                setError(err.response?.data?.error || 'Generation failed. Check server logs.');
        } finally {
            setGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (selected === null || !draftId) return;
        setPublishMsg('');
        try {
            const res = await api.post(`/publish/${draftId}/${selected}`);
            setPublishMsg(res.data.message || 'Timetable published successfully!');
            setPublished(true);
            setDrafts([]);
            setDraftId(null);
            setSelected(null);
        } catch (err) {
            setPublishMsg(err.response?.data?.error || 'Publish failed.');
        }
    };

    return (
        <div className="animate-in" style={{ maxWidth: '800px' }}>

            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <p className="page-eyebrow">Intelligence Engine</p>
                <h2 className="page-title">Timetable Solver</h2>
                <p className="page-subtitle">Generate 3 scored draft timetables, review each, then publish the best one.</p>
            </div>

            {/* Generate Control */}
            <div className="apple-card" style={{ padding: '40px', textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ width: '64px', height: '64px', background: generating ? 'rgba(0,102,204,0.08)' : 'var(--primary)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', transition: 'all 0.3s' }}>
                    {generating
                        ? <Loader2 size={28} color="var(--primary)" className="spin" />
                        : <Zap size={28} color="white" />
                    }
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                    {generating ? 'Computing Optimal Drafts…' : 'Generate Timetable Drafts'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--secondary)', marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px' }}>
                    {generating
                        ? 'The Prolog solver is running. This may take up to 60 seconds.'
                        : 'Ensure infrastructure, sections, rooms, and assignments are configured before generating.'}
                </p>
                <button
                    className="btn btn-primary"
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{ padding: '14px 40px', fontSize: '15px', borderRadius: '16px', boxShadow: generating ? 'none' : '0 8px 24px rgba(0,102,204,0.25)' }}
                >
                    {generating
                        ? <><Loader2 size={18} className="spin" /> Computing…</>
                        : <><Zap size={18} /> Generate 3 Drafts</>
                    }
                </button>
            </div>

            {/* Error / Feedback */}
            {error && (
                <div className="alert alert-error" style={{ marginBottom: '24px' }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                </div>
            )}

            {publishMsg && published && (
                <div className="alert alert-success" style={{ marginBottom: '24px' }}>
                    <CheckCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{publishMsg}</span>
                </div>
            )}
            {publishMsg && !published && (
                <div className="alert alert-error" style={{ marginBottom: '24px' }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <span>{publishMsg}</span>
                </div>
            )}

            {/* Draft Selection */}
            {drafts.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
                        Select a Draft to Preview
                    </p>
                    <div style={{ display: 'flex', gap: '14px' }}>
                        {drafts.map((d, idx) => (
                            <div
                                key={idx}
                                className={`draft-card ${selected === idx ? 'selected' : ''}`}
                                onClick={() => setSelected(idx)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <Eye size={16} color={selected === idx ? 'var(--primary)' : 'var(--secondary)'} />
                                    <span className="draft-label">Option {String.fromCharCode(65 + idx)}</span>
                                </div>
                                <div style={{ display: 'flex', align: 'center', gap: '6px' }}>
                                    <span className={selected === idx ? 'chip chip-primary' : 'chip'}>
                                        Score: {d.score}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview + Publish */}
            {selected !== null && drafts[selected] && (
                <div>
                    <div className="apple-card" style={{ padding: '28px', marginBottom: '20px' }}>
                        <PreviewGrid
                            timetable={drafts[selected].timetable}
                            title={`Draft ${String.fromCharCode(65 + selected)} — Score: ${drafts[selected].score}`}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handlePublish}
                            style={{ padding: '14px 32px', fontSize: '14px', borderRadius: '14px', boxShadow: '0 8px 24px rgba(0,102,204,0.2)' }}
                        >
                            <Send size={16} /> Publish Draft {String.fromCharCode(65 + selected)}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
