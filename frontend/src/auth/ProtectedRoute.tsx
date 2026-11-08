import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
import {isManualLogout, useAuth} from './useAuth';
import type { UserRole } from '../api/auth';

interface ProtectedRouteProps {
    /** Якщо не вказано, достатньо бути залогіненим. */
    roles?: UserRole[];
}

export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner />
            </Container>
        );
    }

    // Гість: на вхід, запам'ятавши, куди він ішов
    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={isManualLogout() ? undefined : { from: location }}
            />
        );
    }

    // Залогінений, але роль не підходить (аналог 403 на бекенді)
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/forbidden" replace />;
    }

    return <Outlet />;
}