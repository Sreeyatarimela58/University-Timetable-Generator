import React from 'react';

/**
 * AuthLayout — Shared full-page layout for all authentication screens.
 * Handles centering, background, and max-width container.
 * No business logic belongs here.
 */
const AuthLayout = ({ children }) => (
    <div className="portal-bg min-h-screen w-full flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-5xl mx-auto animate-in zoom-in-95">
            {children}
        </div>
    </div>
);

export default AuthLayout;
