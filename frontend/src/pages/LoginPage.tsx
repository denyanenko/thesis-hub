import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Spinner from 'react-bootstrap/Spinner';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';



interface LoginFormValues {
    email: string;
    password: string;
}

export default function LoginPage() {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>();

    const [serverError, setServerError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const { user, loading, login } = useAuth();

// Уже авторизований користувач на сторінці входу не потрібен
    if (!loading && user) return <Navigate to="/profile" replace />;

    const clearServerError = () => setServerError(null);

    const onSubmit = async (values: LoginFormValues) => {
        setServerError(null);
        try {
            await login(values.email.trim(), values.password);
        } catch (err) {
            setServerError(err instanceof Error ? err.message : 'Не вдалося увійти');
        }
    };

    return (
        <Container className="py-5">
            <Card className="auth-card mx-auto shadow-sm">
                <Card.Body className="p-4">
                    <h1 className="h4 mb-4 text-center">Вхід до системи</h1>

                    {serverError && (
                        <Alert variant="danger" className="py-2">
                            {serverError}
                        </Alert>
                    )}

                    <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <Form.Group className="mb-3" controlId="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                autoComplete="username"
                                autoFocus
                                isInvalid={!!errors.email}
                                {...register('email', {
                                    required: 'Введіть email',
                                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Некоректний email' },
                                    onChange: clearServerError,
                                })}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.email?.message}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-4" controlId="password">
                            <Form.Label>Пароль</Form.Label>
                            <InputGroup hasValidation>
                                <Form.Control
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    isInvalid={!!errors.password}
                                    {...register('password', {
                                        required: 'Введіть пароль',
                                        onChange: clearServerError,
                                    })}
                                />
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? 'Сховати пароль' : 'Показати пароль'}
                                >
                                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                                </Button>
                                <Form.Control.Feedback type="invalid">
                                    {errors.password?.message}
                                </Form.Control.Feedback>
                            </InputGroup>
                        </Form.Group>

                        <Button type="submit" className="w-100" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Spinner size="sm" className="me-2" aria-hidden="true" />
                                    Вхід…
                                </>
                            ) : (
                                'Увійти'
                            )}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
}