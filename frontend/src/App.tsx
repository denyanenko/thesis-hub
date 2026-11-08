import {Route, Routes} from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App() {
    return (
        <Routes>
            <Route element={<Layout/>}>
                <Route index element={<HomePage/>}/>
                <Route path="login" element={<LoginPage/>}/>
                <Route path="forbidden" element={<ForbiddenPage/>}/>
                {/* Для будь-якого залогіненого */}
                <Route element={<ProtectedRoute />}>
                    <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Тільки для певних ролей (приклад на майбутнє) */}
                {/* <Route element={<ProtectedRoute roles={['admin']} />}>
                    <Route path="admin/users" element={<UsersPage />} />
                </Route> */}
                <Route path="*" element={<NotFoundPage/>}/>
            </Route>
        </Routes>
    );
}