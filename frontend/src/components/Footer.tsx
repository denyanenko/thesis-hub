import { APP_NAME, APP_TAGLINE } from '../config';

export default function Footer() {
    return (
        <footer className="bg-white text-center text-muted py-4 border-top">
            <div className="container">
                <p className="mb-1 fw-semibold">{APP_NAME}</p>
                <p className="mb-1">{APP_TAGLINE}</p>
                <p className="mb-0 small">
                    &copy; {new Date().getFullYear()} {APP_NAME}. Всі права захищені.
                </p>
            </div>
        </footer>
    );
}