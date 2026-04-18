import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ACCENT_STYLES = {
    blue: {
        iconBg:    'bg-blue-50 group-hover:bg-blue-100',
        iconColor: 'text-blue-600',
        border:    'hover:border-blue-200',
        cta:       'text-blue-600',
    },
    amber: {
        iconBg:    'bg-amber-50 group-hover:bg-amber-100',
        iconColor: 'text-amber-500',
        border:    'hover:border-amber-200',
        cta:       'text-amber-600',
    },
    emerald: {
        iconBg:    'bg-emerald-50 group-hover:bg-emerald-100',
        iconColor: 'text-emerald-600',
        border:    'hover:border-emerald-200',
        cta:       'text-emerald-600',
    },
};

const PortalCard = ({ title, description, icon: Icon, route, accent = 'blue' }) => {
    const navigate = useNavigate();
    const styles   = ACCENT_STYLES[accent] ?? ACCENT_STYLES.blue;

    const handleNavigate = useCallback(() => navigate(route), [navigate, route]);
    const handleKeyDown  = useCallback((e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(route); }
    }, [navigate, route]);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={handleNavigate}
            onKeyDown={handleKeyDown}
            className={[
                'group cursor-pointer select-none',
                'h-full flex flex-col',
                'bg-white/80 backdrop-blur-sm',
                'border border-gray-200/60 rounded-2xl',
                'p-6',
                'transition-all duration-300 ease-out',
                `hover:shadow-lg hover:scale-[1.015] hover:-translate-y-0.5 ${styles.border}`,
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
            ].join(' ')}
        >
            {/* Top: icon + title + description */}
            <div className="flex flex-col gap-3">
                <div className={[
                    'w-12 h-12 flex items-center justify-center rounded-lg',
                    styles.iconBg, 'transition-colors duration-300',
                ].join(' ')}>
                    <Icon size={22} className={styles.iconColor} />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
                    {title}
                </h3>

                <p className="text-sm text-gray-500 leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Bottom: CTA pinned to bottom via mt-auto */}
            <div className="mt-auto pt-5">
                <div className="w-full h-px bg-gray-100 mb-4" />
                <span className={[
                    'inline-flex items-center gap-1.5',
                    'text-sm font-medium',
                    styles.cta,
                    'transition-all duration-200 group-hover:gap-2.5',
                ].join(' ')}>
                    Continue
                    <ArrowRight
                        size={14}
                        className="transition-transform duration-200 group-hover:translate-x-1"
                    />
                </span>
            </div>
        </div>
    );
};

export default PortalCard;
