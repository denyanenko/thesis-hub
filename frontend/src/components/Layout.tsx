import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
    /** Показувати футер? За замовчуванням так. */
    showFooter?: boolean;
}

export default function Layout({ showFooter = true }: LayoutProps) {
    return (
        <div className="d-flex flex-column min-vh-100">
            <Header />
            <main className="flex-grow-1 bg-body-tertiary">
                <Outlet />
            </main>
            {showFooter && <Footer />}
        </div>
    );
}