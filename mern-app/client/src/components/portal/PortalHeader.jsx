import React from 'react';

/**
 * PortalHeader — Pure presentational hero section for the portal page.
 */
const PortalHeader = () => (
    <div className="portal-header">
        <div className="portal-wordmark">
            <span>Uni TT Gen</span>
        </div>

        <p className="portal-eyebrow">
            Academic Precision Suite
        </p>

        <h1 className="portal-title">
            Select Your Portal
        </h1>

        <p className="portal-subtitle">
            Timetable management built for universities — choose your access level below.
        </p>
    </div>
);

export default PortalHeader;
