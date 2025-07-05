import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthForm } from './components/AuthForm';
import { CompanySetup } from './components/CompanySetup';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Rooms } from './pages/Rooms';
import { useAuth } from './hooks/useAuth';

// Lazy load other pages
const Bookings = React.lazy(() => import('./pages/Bookings').then(module => ({ default: module.Bookings })));
const Calendar = React.lazy(() => import('./pages/Calendar').then(module => ({ default: module.Calendar })));
const Settings = React.lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Reports = React.lazy(() => import('./pages/Reports').then(module => ({ default: module.Reports })));
const SuperAdmin = React.lazy(() => import('./pages/SuperAdmin').then(module => ({ default: module.SuperAdmin })));

/**
 * A component to handle the main application content,
 * ensuring hooks are called consistently.
 */
function AppContent() {
  const { user, loading, companyId, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {!user ? (
        <>
          <Route path="/auth" element={<AuthForm />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </>
      ) : !companyId && userRole !== 'super_admin' ? (
        <>
          <Route path="/setup" element={<CompanySetup />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </>
      ) : (
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="rooms" element={<Rooms />} />
          <Route 
            path="bookings" 
            element={
              <React.Suspense fallback={<div className="p-8">Loading...</div>}>
                <Bookings />
              </React.Suspense>
            } 
          />
          <Route 
            path="calendar" 
            element={
              <React.Suspense fallback={<div className="p-8">Loading...</div>}>
                <Calendar />
              </React.Suspense>
            } 
          />
          <Route
            path="reports"
            element={
              <React.Suspense fallback={<div className="p-8">Loading...</div>}>
                <Reports />
              </React.Suspense>
            }
          />
          <Route 
            path="settings" 
            element={
              <React.Suspense fallback={<div className="p-8">Loading...</div>}>
                <Settings />
              </React.Suspense>
            } 
          />
          {userRole === 'super_admin' && (
            <Route
              path="super-admin"
              element={
                <React.Suspense fallback={<div className="p-8">Loading...</div>}>
                  <SuperAdmin />
                </React.Suspense>
              }
            />
          )}
           <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      )}
    </Routes>
  );
}

function App() {
  // The useAuth hook is now called inside AppContent, which is always rendered
  // by the Router. This ensures a stable hook call order.
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;