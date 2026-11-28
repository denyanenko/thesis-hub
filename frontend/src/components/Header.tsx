import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Dropdown from 'react-bootstrap/Dropdown';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Spinner from 'react-bootstrap/Spinner';
import { APP_NAME } from '../config';
import { useAuth } from '../auth/useAuth';
import type { UserRole } from '../api/auth';
import logo from '../assets/logo.svg';

interface NavLinkItem {
    to: string;
    label: string;
    end?: boolean;
    roles?: UserRole[];
}

// Пункти меню в масиві: щоб додати розділ, достатньо дописати один рядок
const NAV_LINKS: NavLinkItem[] = [
    { to: '/', label: 'Головна', end: true },
    { to: '/admin/org-structure', label: 'Оргструктура', roles: ['admin'] },
    { to: '/admin/specialties', label: 'Спеціальності', roles: ['admin'] },
    { to: '/admin/educational-programs', label: 'Освітні програми', roles: ['admin'] },
    { to: '/admin/groups', label: 'Групи', roles: ['admin'] },
];

export default function Header() {
    const { user, loading, logout } = useAuth();

    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await logout();
        } finally {
            setLoggingOut(false);
        }
    };

    const visibleLinks = NAV_LINKS.filter(
        (link) => !link.roles || (user && link.roles.includes(user.role)),
    );

    return (
        <Navbar expand="lg" bg="white" className="border-bottom shadow-sm" collapseOnSelect>
            <Container>
                <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
                    <img
                        src={logo}
                        alt={APP_NAME}
                        height="35"
                        className="d-inline-block align-top"
                    />
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="main-nav" />
                <Navbar.Collapse id="main-nav">
                    <Nav className="me-auto mb-2 mb-lg-0">
                        {visibleLinks.map((link) => (
                            <Nav.Link key={link.to} as={NavLink} to={link.to} end={link.end}>
                                {link.label}
                            </Nav.Link>
                        ))}
                    </Nav>

                    <div className="d-flex">
                        {loading ? null : user ? (
                            <Dropdown align={{ lg: 'end' }}>
                                <Dropdown.Toggle
                                    variant="outline-secondary"
                                    className="d-flex align-items-center"
                                    aria-label="Меню користувача"
                                    disabled={loggingOut}
                                >
                                    {loggingOut ? (
                                        <Spinner size="sm" className="me-2" aria-hidden="true" />
                                    ) : (
                                        <i className="bi bi-person-circle me-2 fs-5" />
                                    )}
                                    <span className="d-none d-lg-inline">
                                        {loggingOut ? 'Вихід…' : user.email}
                                    </span>
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item as={Link} to="/profile">
                                        Профіль
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item as="button" onClick={handleLogout}>
                                        Вийти
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        ) : (
                            <Link className="btn btn-outline-primary" to="/login">
                                Увійти
                            </Link>
                        )}
                    </div>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}
