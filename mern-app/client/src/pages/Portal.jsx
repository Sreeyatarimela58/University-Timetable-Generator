import React from 'react';
import { ShieldCheck, BookOpen, GraduationCap } from 'lucide-react';
import AuthLayout from '../components/layouts/AuthLayout';
import PortalHeader from '../components/portal/PortalHeader';
import PortalCard from '../components/portal/PortalCard';

const ROLES = [
    {
        id:          'admin',
        title:       'Administration',
        description: 'Manage timetables, infrastructure, courses, and user accounts.',
        route:       '/login/admin',
        icon:        ShieldCheck,
        accent:      'blue',
    },
    {
        id:          'prof',
        title:       'Faculty',
        description: 'View your personalized teaching schedule and manage availability.',
        route:       '/login/prof',
        icon:        BookOpen,
        accent:      'amber',
    },
    {
        id:          'student',
        title:       'Student',
        description: "Access your section's class schedule at a glance.",
        route:       '/login/student',
        icon:        GraduationCap,
        accent:      'emerald',
    },
];

export const Portal = () => (
    <AuthLayout>
        <PortalHeader />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {ROLES.map((role) => (
                <PortalCard
                    key={role.id}
                    title={role.title}
                    description={role.description}
                    icon={role.icon}
                    route={role.route}
                    accent={role.accent}
                />
            ))}
        </div>

        <p className="text-center text-[11px] text-gray-400 tracking-wide mt-12">
            Trusted by 50+ academic institutions
        </p>
    </AuthLayout>
);
