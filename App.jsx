import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import AdminDashboard from './pages/AdminDashboard';
import EvaluatorManagement from './pages/EvaluatorManagement';
import CreateTest from './pages/CreateTest';
import BulkUpload from './pages/BulkUpload';
import Students from './pages/Students';
import CourseManager from './pages/CourseManager';
import Reports from './pages/Reports';
import DataMaintenance from './pages/DataMaintenance';
import './App.css';
import './responsive.css';

function AdminApp() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
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
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/create-test" 
              element={
                <ProtectedRoute adminOnly>
                  <CreateTest />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/bulk-upload" 
              element={
                <ProtectedRoute adminOnly>
                  <BulkUpload />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/students" 
              element={
                <ProtectedRoute adminOnly>
                  <Students />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/courses" 
              element={
                <ProtectedRoute adminOnly>
                  <CourseManager />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/evaluators" 
              element={
                <ProtectedRoute adminOnly>
                  <EvaluatorManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/reports" 
              element={
                <ProtectedRoute adminOnly>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/data-maintenance" 
              element={
                <ProtectedRoute adminOnly>
                  <DataMaintenance />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/edit-test/:testId" 
              element={
                <ProtectedRoute adminOnly>
                  <CreateTest />
                </ProtectedRoute>
              } 
            />
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default AdminApp;
