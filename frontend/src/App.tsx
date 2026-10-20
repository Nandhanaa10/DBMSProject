// Route table for Person A's pages. Person C merges these into the full app router.
// Needs:  npm i react-router-dom
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import MyProjectsPage from './pages/MyProjectsPage';
import MySkillsPage from './pages/MySkillsPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-skills" element={<MySkillsPage />} />
              <Route path="/my-projects" element={<MyProjectsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/profile" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
