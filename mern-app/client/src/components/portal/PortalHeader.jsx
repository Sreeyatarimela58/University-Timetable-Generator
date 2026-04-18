import React from 'react';
import { Building2 } from 'lucide-react';

/**
 * PortalHeader — Pure presentational hero section for the portal page.
 */
const PortalHeader = () => (
    <div className="flex flex-col items-center text-center mb-14">

        {/* Wordmark */}
        <div className="flex items-center gap-2.5 mb-10">
            {/* <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/30">
                <Building2 size={18} color="white" strokeWidth={2.5} />
            </div> */}
            <span className="text-base font-bold tracking-tight text-gray-800 leading-none">
                Uni TT Gen
            </span>
        </div>

        {/* Eyebrow */}
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-5">
            Academic Precision Suite
        </p>

        {/* Heading */}
        <h1 className="text-[2.75rem] font-bold tracking-tight text-gray-900 leading-[1.15] mb-4">
            Select Your Portal
        </h1>

        {/* Subtext */}
        <p className="text-[15px] text-gray-500 max-w-[420px] leading-relaxed">
            Timetable management built for universities — choose your access level below.
        </p>
    </div>
);

export default PortalHeader;
