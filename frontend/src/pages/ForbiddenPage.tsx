import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';

export default function ForbiddenPage() {
    return (
        <Container className="py-5 text-center">
            <i className="bi bi-shield-lock text-danger" style={{ fontSize: '3rem' }} />
            <h1 className="h3 mt-3">Недостатньо прав</h1>
            <p className="text-muted">У вас немає доступу до цієї сторінки.</p>
            <Link to="/" className="btn btn-primary">
                На головну
            </Link>
        </Container>
    );
}