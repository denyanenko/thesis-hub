import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import { Link } from 'react-router-dom';
import { APP_NAME } from '../config';
import { useAuth } from '../auth/useAuth';

export default function HomePage() {
    const { user, loading } = useAuth();
    return (
        <Container className="py-5">
            {/* Секція привітання (Hero) */}
            <div className="text-center mb-5 mt-4">
                <i className="bi bi-mortarboard-fill text-primary" style={{ fontSize: '4rem' }}></i>
                <h1 className="display-5 fw-bold text-dark mb-3 mt-2">
                    Ласкаво просимо до {APP_NAME || 'Thesis Hub'}
                </h1>
                <p className="lead text-muted mx-auto" style={{ maxWidth: '800px' }}>
                    Інформаційна система підтримки вибору наукового керівника та супроводу студентських кваліфікаційних робіт.
                </p>
                {!loading && !user && (
                    <div className="d-flex justify-content-center gap-3 mt-4">
                        <Link to="/login" className="btn btn-primary btn-lg px-4 shadow-sm">
                            Увійти в систему
                        </Link>
                    </div>
                )}
            </div>

            {/* Секція ключових функцій (Переваги) */}
            <Row className="g-4 mt-5">
                <Col md={4}>
                    <Card className="h-100 border-0 shadow-sm text-center p-3 bg-white hover-lift">
                        <Card.Body>
                            <div className="mb-3">
                                <i className="bi bi-sliders fs-1 text-primary"></i>
                            </div>
                            <Card.Title className="fw-bold">Інтелектуальний вибір</Card.Title>
                            <Card.Text className="text-muted">
                                Гібридна двофазова модель підбору керівника за допомогою інтерактивних повзунків та врахування ваших особистих пріоритетів.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card className="h-100 border-0 shadow-sm text-center p-3 bg-white hover-lift">
                        <Card.Body>
                            <div className="mb-3">
                                <i className="bi bi-person-lines-fill fs-1 text-primary"></i>
                            </div>
                            <Card.Title className="fw-bold">Прозорість квот</Card.Title>
                            <Card.Text className="text-muted">
                                Завжди актуальна інформація про наявність вільних місць у викладачів та доступ до детальних академічних профілів.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card className="h-100 border-0 shadow-sm text-center p-3 bg-white hover-lift">
                        <Card.Body>
                            <div className="mb-3">
                                <i className="bi bi-chat-dots fs-1 text-primary"></i>
                            </div>
                            <Card.Title className="fw-bold">Супровід роботи</Card.Title>
                            <Card.Text className="text-muted">
                                Зручна подача заявок, контроль дедлайнів, обмін матеріалами та вбудований чат для комунікації з керівником у реальному часі.
                            </Card.Text>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}