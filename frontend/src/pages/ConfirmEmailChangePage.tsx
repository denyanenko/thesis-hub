import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ME_KEY, confirmEmailChange } from '../api/auth';
import { PROFILE_KEY } from '../api/profile';

export default function ConfirmEmailChangePage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleConfirm = async () => {
        setServerError(null);
        setIsSubmitting(true);
        try {
            const message = await confirmEmailChange(token);
            queryClient.setQueryData(ME_KEY, null);
            queryClient.removeQueries({ queryKey: PROFILE_KEY });
            navigate('/login', {
                replace: true,
                state: { infoMessage: message },
            });
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : 'Не вдалося підтвердити зміну пошти',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container className="py-5">
            <Card className="auth-card mx-auto shadow-sm">
                <Card.Body className="p-4">
                    <h1 className="h4 mb-3 text-center">✉️ Підтвердження нової пошти</h1>

                    {!token ? (
                        <>
                            <Alert variant="danger" className="py-2">
                                Посилання для підтвердження зміни пошти відсутнє або некоректне.
                            </Alert>
                            <div className="d-grid gap-2">
                                <Link to="/profile" className="btn btn-primary">
                                    Перейти до профілю
                                </Link>
                                <Link to="/login" className="btn btn-outline-secondary">
                                    Повернутися до входу
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-muted small mb-4">
                                Натисніть кнопку нижче, щоб підтвердити зміну електронної пошти.
                                Після підтвердження всі активні сеанси будуть завершені — потрібно
                                буде увійти з новою адресою.
                            </p>

                            {serverError && (
                                <Alert variant="danger" className="py-2">
                                    {serverError}
                                </Alert>
                            )}

                            <div className="d-grid gap-2">
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={handleConfirm}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner
                                                size="sm"
                                                className="me-2"
                                                aria-hidden="true"
                                            />
                                            Підтвердження…
                                        </>
                                    ) : (
                                        'Підтвердити зміну пошти'
                                    )}
                                </Button>

                                <Link to="/login" className="btn btn-outline-secondary">
                                    Скасувати
                                </Link>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}
