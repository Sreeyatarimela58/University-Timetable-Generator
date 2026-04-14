import React from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { CalendarDays, Home, LayoutGrid, LogOut, ShieldCheck } from 'lucide-react'
import { Dashboard } from './pages/Dashboard'
import { TimetableGrid } from './components/TimetableGrid'
import { Portal } from './pages/Portal'
import { Login } from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'

// Layout Component
const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem' }}>
          <CalendarDays size={32} color="var(--brand-primary)" />
          Timetable Engine
        </h1>
        
        {user && (
            <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {user.role === 'admin' && (
                  <Link to="/admin" className="btn glass-panel" style={{ padding: '0.5rem 1rem' }}>
                    <Home size={18} /> Admin Console
                  </Link>
              )}
              
              <Link to="/timetable" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                <LayoutGrid size={18} /> {user.role === 'admin' ? 'Global Grid' : 'My Schedule'}
              </Link>

              <button onClick={logout} className="btn" style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)' }}>
                <LogOut size={18} /> Logout
              </button>
            </nav>
        )}
      </header>
      <main>
        {children}
      </main>
    </div>
  )
}

const BaseRoutes = () => {
    const { user } = useAuth();
    
    if(!user) {
        return (
            <Routes>
                <Route path="/" element={<Portal />} />
                <Route path="/login/:role" element={<Login />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        );
    }
    
    return (
      <Routes>
        {user.role === 'admin' && <Route path="/admin" element={<Dashboard />} />}
        <Route path="/timetable" element={<TimetableGrid />} />
        
        {/* Default logic for authenticated users */}
        <Route path="/" element={<Navigate to={user.role === 'admin' ? "/admin" : "/timetable"} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
}

function App() {
  return (
    <AuthProvider>
        <Layout>
            <BaseRoutes />
        </Layout>
    </AuthProvider>
  )
}

export default App
