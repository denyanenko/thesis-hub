import { Link, NavLink } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { APP_NAME } from '../config';
import { useNavigate } from 'react-router-dom';
import Dropdown from 'react-bootstrap/Dropdown';
import { useAuth } from '../auth/useAuth';

// Пункти меню в масиві: щоб додати розділ, достатньо дописати один рядок
const NAV_LINKS = [{ to: '/', label: 'Головна', end: true }];

export default function Header() {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };
    return (
        <Navbar expand="lg" bg="light" className="border-bottom shadow-sm" collapseOnSelect>
            <Container>
                <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
                    <i className="bi bi-mortarboard-fill fs-4 text-primary me-2" />
                    <span className="fw-bold">{APP_NAME}</span>
                </Navbar.Brand>

                <Navbar.Toggle aria-controls="main-nav" />
                <Navbar.Collapse id="main-nav">
                    <Nav className="me-auto mb-2 mb-lg-0">
                        {NAV_LINKS.map((link) => (
                            <Nav.Link key={link.to} as={NavLink} to={link.to} end={link.end}>
                                {link.label}
                            </Nav.Link>
                        ))}
                    </Nav>

                    <div className="d-flex">
                        {loading ? null : user ? (
                            <Dropdown align="end">
                                <Dropdown.Toggle
                                    variant="outline-secondary"
                                    className="d-flex align-items-center"
                                    aria-label="Меню користувача"
                                >
                                    <i className="bi bi-person-circle me-2 fs-5" />
                                    <span className="d-none d-lg-inline">{user.email}</span>
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