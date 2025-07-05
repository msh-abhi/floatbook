// src/App.tsx

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
const SuperAdmin = React.lazy(() => import('./pages/SuperAdmin').then(module => ({ default: module.SuperAdmin }))); // Lazy load SuperAdmin

function App() {
  const { user, loading, companyId, userRole } = useAuth(); // Get userRole

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

  if (!user) {
    return <AuthForm />;
  }

  // If the user is a super_admin, they don't need a companyId to proceed
  if (!companyId && userRole !== 'super_admin') {
    return <CompanySetup />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/" element={<Layout />}>
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
          {/* Super Admin Route */}
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
        </Route>
      </Routes>
    </Router>
  );
}

export default App;