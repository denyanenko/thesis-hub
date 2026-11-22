import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ME_KEY, emergencyPasswordLock } from '../api/auth';
import { PROFILE_KEY } from '../api/profile';

export default function EmergencyPasswordLockPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleLock = async () => {
        setServerError(null);
        setIsSubmitting(true);
        try {
            const { resetToken, message } = await emergencyPasswordLock(token);
            queryClient.setQueryData(ME_KEY, null);
            queryClient.removeQueries({ queryKey: PROFILE_KEY });
            navigate(`/reset-password?token=${encodeURIComponent(resetToken)}`, {
                replace: true,
                state: { infoMessage: message },
            });
        } catch (err) {
            setServerError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося виконати екстрене блокування',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container className="py-5">
            <Card className="auth-card mx-auto shadow-sm">
                <Card.Body className="p-4">
                    <h1 className="h4 mb-3 text-center">🚨 Екстрене блокування акаунта</h1>

                    {!token ? (
                        <>
                            <Alert variant="danger" className="py-2">
                                Посилання для екстреного блокування відсутнє або некоректне.
                            </Alert>
                            <div className="d-grid gap-2">
                                <Link to="/forgot-password" className="btn btn-primary">
                                    Відновити пароль
                                </Link>
                                <Link to="/login" className="btn btn-outline-secondary">
                                    Повернутися до входу
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <Alert variant="warning" className="small py-2">
                                Використовуйте цю дію, якщо ви <strong>не змінювали</strong> пароль
                                свого акаунта.
                            </Alert>

                            <p className="text-muted small mb-4">
                                Після натискання кнопки поточний пароль буде негайно замінено на
                                випадковий, усі активні сеанси буде завершено, а вас буде
                                перенаправлено на сторінку встановлення нового пароля.
                            </p>

                            {serverError && (
                                <Alert variant="danger" className="py-2">
                                    <div>{serverError}</div>
                                    <div className="mt-2">
                                        <Link
                                            to="/forgot-password"
                                            className="alert-link small"
                                        >
                                            Скористатися відновленням пароля
                                        </Link>
                                    </div>
                                </Alert>
                            )}

                            <div className="d-grid gap-2">
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={handleLock}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner
                                                size="sm"
                                                className="me-2"
                                                aria-hidden="true"
                                            />
                                            Блокування сеансів…
                                        </>
                                    ) : (
                                        'Заблокувати сеанси та змінити пароль'
                                    )}
                                </Button>

                                <Link to="/login" className="btn btn-outline-secondary">
                                    Повернутися до входу
                                </Link>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}
