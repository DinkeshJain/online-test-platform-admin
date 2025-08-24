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
import AttendanceView from './pages/AttendanceView';
import './App.css';
import './index.css';

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
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/register" element={<AdminRegister />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/create-test" 
              element={
                <ProtectedRoute adminOnly>
                  <CreateTest />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/bulk-upload" 
              element={
                <ProtectedRoute adminOnly>
                  <BulkUpload />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/students" 
              element={
                <ProtectedRoute adminOnly>
                  <Students />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendance"
              element={
                <ProtectedRoute adminOnly>
                  <AttendanceView />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/courses" 
              element={
                <ProtectedRoute adminOnly>
                  <CourseManager />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/evaluators" 
              element={
                <ProtectedRoute adminOnly>
                  <EvaluatorManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute adminOnly>
                  <Reports />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/data-maintenance" 
              element={
                <ProtectedRoute adminOnly>
                  <DataMaintenance />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/edit-test/:testId" 
              element={
                <ProtectedRoute adminOnly>
                  <CreateTest />
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
