import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { TimetableGrid } from './components/TimetableGrid';
import { Portal } from './pages/Portal';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';


// Dashboard Tabs
import { OverviewTab }       from './components/dashboard/OverviewTab';
import { InfrastructureTab } from './components/dashboard/InfrastructureTab';
import { CoursesTab }        from './components/dashboard/CoursesTab';
import { UsersTab }           from './components/dashboard/UsersTab';
import { AssignmentsTab }    from './components/dashboard/AssignmentsTab';
import { SolverTab }         from './components/dashboard/SolverTab';
import { ArchivesTab }       from './components/dashboard/ArchivesTab';
import { TopHeader }         from './components/TopHeader';

// ─── Authenticated Admin Layout ──────────────────────────────
const AdminLayout = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();

    const isFullWidth = user?.role === 'prof' || user?.role === 'student';

    // Mapping titles to paths for the TopHeader
    const titles = {
        '/admin/overview':       'Administrative Intelligence',
        '/admin/infrastructure': 'Infrastructure Management',
        '/admin/courses':        'Curriculum Architecture',
        '/admin/users':          'Faculty & Student Directory',
        '/admin/assignments':    'Academic Load Assignment',
        '/admin/solver':         'Intelligence Engine',
        '/admin/archives':       'Academic Records',
        '/timetable':            'Timetable Master View',
    };

    const title = titles[location.pathname] || 'Uni TT Gen';

    return (
        <div className="app-layout">
            {!isFullWidth && <Sidebar />}
            <div className="app-main" style={isFullWidth ? { marginLeft: 0 } : {}}>
                {isFullWidth && <TopHeader title={title} />}
                <div className="animate-in" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

// ─── Route Guard & Router ────────────────────────────────────
const BaseRoutes = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#020617', color: '#e2e8f0' }}>
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <Routes>
                <Route path="/"             element={<Portal />} />
                <Route path="/login/:role"  element={<Login />} />
                <Route path="*"             element={<Navigate to="/" />} />
            </Routes>
        );
    }

    return (
        <AdminLayout>
            <Routes>
                {user.role === 'admin' && (
                    <Route path="/admin" element={<Dashboard />}>
                        {/* Redirection from /admin to /admin/overview */}
                        <Route index element={<Navigate to="/admin/overview" replace />} />
                        <Route path="overview"       element={<OverviewTab />} />
                        <Route path="infrastructure" element={<InfrastructureTab />} />
                        <Route path="courses"        element={<CoursesTab />} />
                        <Route path="users"          element={<UsersTab />} />
                        <Route path="assignments"    element={<AssignmentsTab />} />
                        <Route path="solver"         element={<SolverTab />} />
                        <Route path="archives"       element={<ArchivesTab />} />
                    </Route>
                )}
                <Route path="/timetable" element={<TimetableGrid />} />
                
                {/* Fallback routing */}
                <Route path="/"    element={<Navigate to={user.role === 'admin' ? '/admin/overview' : '/timetable'} replace />} />
                <Route path="*"    element={<Navigate to="/" replace />} />
            </Routes>
        </AdminLayout>
    );
};

// ─── Root App ────────────────────────────────────────────────
function App() {
    return (
        <AuthProvider>
            <BaseRoutes />
        </AuthProvider>
    );
}

export default App;
