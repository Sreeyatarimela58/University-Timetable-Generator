import React, { useState } from 'react';
import api from '../../api/client';
import { PreviewGrid } from '../PreviewGrid';
import { Zap, Eye, Send, Loader2, AlertTriangle } from 'lucide-react';

export const GenerateTab = () => {
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [draftId, setDraftId] = useState(null);
    const [drafts, setDrafts] = useState([]);   // array of { score, timetable }
    const [selected, setSelected] = useState(null); // index
    const [publishMsg, setPublishMsg] = useState('');

    const handleGenerate = async () => {
        setGenerating(true);
        setError('');
        setDraftId(null);
        setDrafts([]);
        setSelected(null);
        setPublishMsg('');
        try {
            const res = await api.post('/generate-drafts');
            const id = res.data.draftId;
            setDraftId(id);
            // Now fetch the full draft data
            const draftRes = await api.get(`/drafts/${id}`);
            setDrafts(draftRes.data.drafts || []);
        } catch (err) {
            if (err.response?.status === 423) {
                setError('Another generation is already running. Please wait.');
            } else if (err.response?.status === 400) {
                setError(err.response.data.error || 'Missing timetable data.');
            } else {
                setError(err.response?.data?.error || 'Generation failed. Check server logs.');
            }
        } finally {
            setGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (selected === null || !draftId) return;
        setPublishMsg('');
        try {
            const res = await api.post(`/publish/${draftId}/${selected}`);
            setPublishMsg(res.data.message);
            setDrafts([]);
            setDraftId(null);
            setSelected(null);
        } catch (err) {
            setPublishMsg(err.response?.data?.error || 'Publish failed.');
        }
    };

    return (
        <div className="tab-content">
            {/* Generate Controls */}
            <div className="glass-panel" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <h3><Zap size={20} style={{ verticalAlign: 'middle' }} /> Timetable Solver</h3>
                <p className="hint-text" style={{ marginBottom: '1rem' }}>
                    Generates 3 scored draft timetables for review. Select the best, then publish.
                </p>
                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}
                    style={{ fontSize: '1.1rem', padding: '0.8rem 2.5rem' }}>
                    {generating
                        ? <><Loader2 size={20} className="spin" /> Computing Drafts...</>
                        : <><Zap size={20} /> Generate 3 Drafts</>
                    }
                </button>
                {error && (
                    <div className="error-box" style={{ marginTop: '1rem' }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}
            </div>

            {/* Draft Selection */}
            {drafts.length > 0 && (
                <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                    <h3>Select a Draft</h3>
                    <div className="draft-options">
                        {drafts.map((d, idx) => (
                            <button key={idx}
                                className={`draft-option-btn ${selected === idx ? 'draft-selected' : ''}`}
                                onClick={() => setSelected(idx)}>
                                <Eye size={18} />
                                <span className="draft-label">Option {String.fromCharCode(65 + idx)}</span>
                                <span className="draft-score">Score: {d.score}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview of selected draft */}
            {selected !== null && drafts[selected] && (
                <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
                    <PreviewGrid
                        timetable={drafts[selected].timetable}
                        title={`Draft ${String.fromCharCode(65 + selected)} — Score: ${drafts[selected].score}`}
                    />
                    <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                        <button className="btn btn-publish" onClick={handlePublish}>
                            <Send size={18} /> Publish Draft {String.fromCharCode(65 + selected)}
                        </button>
                    </div>
                </div>
            )}

            {/* Publish confirmation */}
            {publishMsg && (
                <div className="glass-panel success-box">
                    {publishMsg}
                </div>
            )}
        </div>
    );
};
