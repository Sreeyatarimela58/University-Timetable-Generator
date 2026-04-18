import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const PortalCard = ({ title, description, icon: Icon, route, accent = 'blue' }) => {
    const navigate = useNavigate();

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
            className="portal-card"
            data-accent={accent}
        >
            <div className="portal-card-icon-wrapper">
                <Icon size={22} />
            </div>

            <h3 className="portal-card-title">
                {title}
            </h3>

            <p className="portal-card-desc">
                {description}
            </p>

            <div className="portal-card-footer">
                <div className="portal-card-divider" />
                <span className="portal-card-cta">
                    Continue
                    <ArrowRight size={14} className="portal-card-arrow" />
                </span>
            </div>
        </div>
    );
};

export default PortalCard;
