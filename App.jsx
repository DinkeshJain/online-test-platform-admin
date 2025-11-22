import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LazyWrapper from './components/LazyWrapper';
import RoutePreloader from './components/RoutePreloader';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';

// Lazy load test management components for better performance
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const CreateTest = React.lazy(() => import('./pages/CreateTest'));
const Reports = React.lazy(() => import('./pages/Reports'));
const EvaluatorManagement = React.lazy(() => import('./pages/EvaluatorManagement'));
const BulkUpload = React.lazy(() => import('./pages/BulkUpload'));
const Students = React.lazy(() => import('./pages/Students'));
const CourseManager = React.lazy(() => import('./pages/CourseManager'));
const DataMaintenance = React.lazy(() => import('./pages/DataMaintenance'));
const AttendanceView = React.lazy(() => import('./pages/AttendanceView'));
import './App.css';
import './index.css';

function AdminApp() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <RoutePreloader />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#10b981',
                },
              },
              error: {
                duration: 5000,
                style: {
                  background: '#ef4444',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/register" element={<AdminRegister />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper enhancedLoader>
                    <AdminDashboard />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-test" 
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper enhancedLoader>
                    <CreateTest />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/bulk-upload" 
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper>
                    <BulkUpload />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/students" 
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper>
                    <Students />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendance"
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper>
                    <AttendanceView />
                  </LazyWrapper>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/courses" 
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper>
                    <CourseManager />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/evaluators" 
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper enhancedLoader>
                    <EvaluatorManagement />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper enhancedLoader>
                    <Reports />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/data-maintenance" 
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper>
                    <DataMaintenance />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-test/:testId" 
              element={
                <ProtectedRoute adminOnly>
                  <LazyWrapper enhancedLoader>
                    <CreateTest />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            <Route path="/admin" element={<Navigate to="/login" replace />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default AdminApp;
