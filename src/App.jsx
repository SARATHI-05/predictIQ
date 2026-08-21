import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Existing Pages (Preserved)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';

import FoodRecords from './pages/FoodRecords';
import DatasetUpload from './pages/DatasetUpload';
import Predictions from './pages/Predictions';
import ResourcePlanning from './pages/ResourcePlanning';
import Wastage from './pages/Wastage';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

// New Feature Pages
import Inventory from './pages/Inventory';
import ModelPerformance from './pages/ModelPerformance';
import PredictionAccuracy from './pages/PredictionAccuracy';
import AuditLogs from './pages/AuditLogs';
import UserManagement from './pages/UserManagement';
import NotificationCenter from './pages/NotificationCenter';

// Main App Layout Wrapper for Protected Pages
const AppLayout = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="app-container">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="main-content">
        <Navbar onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
};


function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />


            {/* Protected Application Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/food-records"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <FoodRecords />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dataset-upload"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DatasetUpload />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/predictions"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Predictions />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resource-planning"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ResourcePlanning />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Inventory />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/wastage"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Wastage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Analytics />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/model-performance"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AppLayout>
                    <ModelPerformance />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/prediction-accuracy"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AppLayout>
                    <PredictionAccuracy />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Reports />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <NotificationCenter />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Alerts />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AppLayout>
                    <AuditLogs />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/user-management"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AppLayout>
                    <UserManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* Default Fallback Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
