import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy-load theo từng route — quan trọng nhất là ProjectEditor: nó kéo theo cả
// AssetSidebar/InspectorSidebar/ArScene và hook useAframeScript (bản thân hook không nặng,
// nhưng nó là nơi gọi import('aframe') động — chunk aframe 1.3MB CHỈ tải khi thật sự vào
// trang editor, không phải lúc app khởi động). Trước đây cả 4 trang import tĩnh trong
// App.tsx, nên ai chỉ ghé /login cũng phải tải sẵn toàn bộ code trình soạn thảo AR mà họ
// chưa chắc dùng tới.
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/Signup').then((m) => ({ default: m.Signup })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const ProjectEditor = lazy(() =>
  import('./pages/ProjectEditor/ProjectEditor').then((m) => ({ default: m.ProjectEditor }))
);

/** Fallback tối giản trong lúc chunk của route đang tải — chỉ chớp trong chốc lát trên
 * mạng bình thường, không cần UI cầu kỳ. */
function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#0d0e12] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:id"
              element={
                <ProtectedRoute>
                  <ProjectEditor />
                </ProtectedRoute>
              }
            />
            {/* Default fallback route redirects to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;