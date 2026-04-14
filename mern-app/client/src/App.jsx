import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { CalendarDays, Home, LayoutGrid } from 'lucide-react'
import { Dashboard } from './pages/Dashboard'
import { TimetableGrid } from './components/TimetableGrid'

// Layout Component
const Layout = ({ children }) => {
  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem' }}>
          <CalendarDays size={32} color="var(--brand-primary)" />
          Timetable Engine
        </h1>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/" className="btn glass-panel" style={{ padding: '0.5rem 1rem' }}>
            <Home size={18} /> Admin Setup
          </Link>
          <Link to="/timetable" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
            <LayoutGrid size={18} /> View Timetable
          </Link>
        </nav>
      </header>
      <main>
        {children}
      </main>
    </div>
  )
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/timetable" element={<TimetableGrid />} />
      </Routes>
    </Layout>
  )
}

export default App
