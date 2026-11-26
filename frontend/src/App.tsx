import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ConfirmEmailChangePage from './pages/ConfirmEmailChangePage';
import RevertEmailChangePage from './pages/RevertEmailChangePage';
import EmergencyPasswordLockPage from './pages/EmergencyPasswordLockPage';
import ProfilePage from './pages/ProfilePage';
import OrgStructurePage from './pages/OrgStructurePage';
import SpecialtiesPage from './pages/SpecialtiesPage';
import EducationalProgramsPage from './pages/EducationalProgramsPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './auth/ProtectedRoute';

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route path="confirm-email-change" element={<ConfirmEmailChangePage />} />
                <Route path="revert-email-change" element={<RevertEmailChangePage />} />
                <Route
                    path="emergency-password-lock"
                    element={<EmergencyPasswordLockPage />}
                />
                <Route path="forbidden" element={<ForbiddenPage />} />
                {/* Для будь-якого залогіненого */}
                <Route element={<ProtectedRoute />}>
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Адміністрування */}
                <Route element={<ProtectedRoute roles={['admin']} />}>
                    <Route path="admin/org-structure" element={<OrgStructurePage />} />
                    <Route path="admin/specialties" element={<SpecialtiesPage />} />
                    <Route
                        path="admin/educational-programs"
                        element={<EducationalProgramsPage />}
                    />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
            </Route>
        </Routes>
    );
}
