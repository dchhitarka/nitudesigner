import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import CategoryManagement from "./pages/CategoryManagement";
import ImageUpload from "./pages/ImageUpload";
import LehangaStore from "./pages/LehangaStore";
import ProtectedRoute from "./pages/ProtectedRoute";
import SharedImage from "./pages/SharedImage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LehangaStore />} />
        <Route path="/shared/:imageName" element={<SharedImage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        {/* Protected Admin Routes */}
        <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/categories" 
            element={
              <ProtectedRoute>
                <CategoryManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/upload" 
            element={
              <ProtectedRoute>
                <ImageUpload />
              </ProtectedRoute>
            } 
          />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />          
      </Routes>
      <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
    </BrowserRouter>
  );
}
