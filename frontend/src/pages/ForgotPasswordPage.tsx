import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import { Link, Navigate } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import { useAuth } from '../auth/useAuth';

interface ForgotPasswordFormValues {
    email: string;
}

export default function ForgotPasswordPage() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordFormValues>();

    const [serverError, setServerError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const { user, loading } = useAuth();

    if (!loading && user) return <Navigate to="/" replace />;

    const clearServerError = () => setServerError(null);

    const onSubmit = async (values: ForgotPasswordFormValues) => {
        setServerError(null);
        try {
            const message = await forgotPassword(values.email.trim());
            setSuccessMessage(message);
        } catch (err) {
            setServerError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося надіслати запит на відновлення пароля',
            );
        }
    };

    return (
        <Container className="py-5">
            <Card className="auth-card mx-auto shadow-sm">
                <Card.Body className="p-4">
                    <h1 className="h4 mb-3 text-center">📧 Відновлення пароля</h1>

                    {successMessage ? (
                        <>
                            <Alert variant="success" className="py-2">
                                {successMessage}
                            </Alert>
                            <p className="text-muted small mb-4">
                                Перевірте вхідні листи та папку «Спам». Посилання для зміни пароля
                                дійсне протягом 1 години.
                            </p>
                            <div className="d-grid gap-2">
                                <Link to="/login" className="btn btn-primary">
                                    Повернутися до входу
                                </Link>
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    onClick={() => setSuccessMessage(null)}
                                >
                                    Надіслати на інший email
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-muted small mb-4 text-center">
                                Введіть email вашого акаунта — ми надішлемо посилання для
                                встановлення нового пароля.
                            </p>

                            {serverError && (
                                <Alert variant="danger" className="py-2">
                                    {serverError}
                                </Alert>
                            )}

                            <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                                <Form.Group className="mb-4" controlId="forgot-email">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        autoComplete="username"
                                        autoFocus
                                        isInvalid={!!errors.email}
                                        {...register('email', {
                                            required: 'Введіть email',
                                            pattern: {
                                                value: /^\S+@\S+\.\S+$/,
                                                message: 'Некоректний email',
                                            },
                                            onChange: clearServerError,
                                        })}
                                    />
                                    <Form.Control.Feedback type="invalid">
                                        {errors.email?.message}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Button type="submit" className="w-100" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Spinner
                                                size="sm"
                                                className="me-2"
                                                aria-hidden="true"
                                            />
                                            Надсилання…
                                        </>
                                    ) : (
                                        'Надіслати інструкцію'
                                    )}
                                </Button>
                            </Form>

                            <div className="text-center mt-3">
                                <Link to="/login" className="small text-decoration-none">
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
