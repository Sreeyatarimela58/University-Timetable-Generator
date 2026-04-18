import React from 'react';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7, 8];
const TIME_LABELS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

const COMPONENT_COLORS = {
    theory: { badge: 'var(--primary)', bg: 'rgba(0,102,204,0.04)' },
    lab:    { badge: '#ff9500',        bg: 'rgba(255,149,0,0.04)' }
};

export const PreviewGrid = ({ timetable = [], title = 'Draft Preview' }) => {
    const findEntry = (day, slot) => timetable.find(e => e.day === day && e.slot === slot);

    const renderCell = (day, slot) => {
        if (slot === 4 || slot === 5) {
            const entry = findEntry(day, slot);
            if (!entry) {
                return (
                    <div className="tt-cell bg-slate-50/50 border-r last:border-r-0" key={`${day}-${slot}`}>
                        <div className="flex items-center justify-center h-full text-slate-300">
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Lunch</span>
                        </div>
                    </div>
                );
            }
        }

        const entry = findEntry(day, slot);
        if (entry) {
            if (entry.status === 0) {
                 return <div className="tt-cell border-r last:border-r-0 bg-red-50 text-red-500 flex items-center justify-center text-xs font-semibold" key={`${day}-${slot}`}>Unassigned</div>;
            }

            const isLab = entry.component === 'lab';
            const color = isLab ? COMPONENT_COLORS.lab : COMPONENT_COLORS.theory;
            
            return (
                <div className="tt-cell border-r last:border-r-0 p-1.5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:z-10 relative cursor-pointer" key={`${day}-${slot}`}>
                    <div className="h-full flex flex-col justify-between rounded-lg overflow-hidden" style={{ background: color.bg, border: `1px solid ${color.badge}22`, padding: '8px 10px' }}>
                        <div>
                            <p className="font-bold uppercase tracking-wide mb-1" style={{ color: color.badge, fontSize: '9px' }}>
                                {isLab ? 'LAB' : 'THEORY'}
                            </p>
                            <p className="font-medium leading-tight text-slate-800" style={{ fontSize: '11px' }}>{entry.courseName}</p>
                        </div>
                        <div className="mt-2" style={{ fontSize: '9px' }}>
                            <p className="font-semibold text-slate-700">{entry.teacherName}</p>
                            <p className="text-slate-500 truncate">{entry.roomName}</p>
                        </div>
                    </div>
                </div>
            );
        }
        return <div className="tt-cell border-r last:border-r-0 bg-white" key={`${day}-${slot}`} />;
    };

    return (
        <div className="w-full h-full flex flex-col pt-2">
            <div className="flex justify-between items-center mb-6 shrink-0 px-2">
                <h3 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500">{title}</h3>
                <div className="flex gap-4 bg-slate-50 px-3 py-1.5 rounded-full border shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm bg-blue-500 shadow-sm shadow-blue-200"></div>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Theory</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm bg-orange-500 shadow-sm shadow-orange-200"></div>
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Lab</span>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden flex-1 flex flex-col ring-1 ring-slate-900/5">
                <div className="bg-slate-50 border-b grid grid-cols-[80px_repeat(5,minmax(0,1fr))] shrink-0 divide-x divide-slate-200 shadow-sm">
                    <div className="p-3 flex items-center justify-center font-bold text-slate-400 text-[10px] uppercase tracking-widest bg-slate-100/50">Time</div>
                    {DAY_LABELS.map(d => (
                        <div key={d} className="p-3 text-center text-xs font-extrabold text-slate-700 tracking-wider uppercase group hover:bg-slate-100/50 transition-colors">{d}</div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/30 font-sans divide-y divide-slate-100">
                    {SLOTS.map((slot, idx) => (
                        <div key={slot} className="grid grid-cols-[80px_repeat(5,minmax(0,1fr))] min-h-[105px] group">
                            <div className="p-2 border-r bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-xs tracking-wider shadow-[inset_-2px_0_4px_rgba(0,0,0,0.02)]">
                                {TIME_LABELS[idx]}
                            </div>
                            {DAYS.map(day => renderCell(day, slot))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
