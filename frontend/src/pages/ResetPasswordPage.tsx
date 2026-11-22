import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Spinner from 'react-bootstrap/Spinner';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ME_KEY, resetPassword } from '../api/auth';
import { PROFILE_KEY } from '../api/profile';

interface ResetPasswordFormValues {
    newPassword: string;
    confirmPassword: string;
}

interface ResetPasswordLocationState {
    infoMessage?: string;
}

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';

    const location = useLocation();
    const locationState = location.state as ResetPasswordLocationState | null;
    const infoMessage = locationState?.infoMessage ?? null;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormValues>();

    const [serverError, setServerError] = useState<string | null>(null);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const clearServerError = () => setServerError(null);

    const onSubmit = async (values: ResetPasswordFormValues) => {
        setServerError(null);
        try {
            const message = await resetPassword(token, values.newPassword);
            queryClient.setQueryData(ME_KEY, null);
            queryClient.removeQueries({ queryKey: PROFILE_KEY });
            navigate('/login', {
                replace: true,
                state: { infoMessage: message },
            });
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : 'Не вдалося змінити пароль',
            );
        }
    };

    return (
        <Container className="py-5">
            <Card className="auth-card mx-auto shadow-sm">
                <Card.Body className="p-4">
                    <h1 className="h4 mb-4 text-center">🔒 Новий пароль</h1>

                    {!token ? (
                        <>
                            <Alert variant="danger" className="py-2">
                                Посилання для відновлення пароля відсутнє або некоректне.
                            </Alert>
                            <div className="d-grid gap-2">
                                <Link to="/forgot-password" className="btn btn-primary">
                                    Запросити нове посилання
                                </Link>
                                <Link to="/login" className="btn btn-outline-secondary">
                                    Повернутися до входу
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            {infoMessage && (
                                <Alert variant="warning" className="small py-2">
                                    {infoMessage}
                                </Alert>
                            )}

                            {serverError && (
                                <Alert variant="danger" className="py-2">
                                    <div>{serverError}</div>
                                    <div className="mt-2">
                                        <Link
                                            to="/forgot-password"
                                            className="alert-link small"
                                        >
                                            Запросити нове посилання
                                        </Link>
                                    </div>
                                </Alert>
                            )}

                            <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                                <Form.Group className="mb-3" controlId="new-password">
                                    <Form.Label>Новий пароль</Form.Label>
                                    <InputGroup hasValidation>
                                        <Form.Control
                                            type={showNewPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            autoFocus
                                            isInvalid={!!errors.newPassword}
                                            {...register('newPassword', {
                                                required: 'Введіть новий пароль',
                                                minLength: {
                                                    value: 8,
                                                    message:
                                                        'Пароль повинен містити щонайменше 8 символів',
                                                },
                                                maxLength: {
                                                    value: 128,
                                                    message:
                                                        'Пароль не може перевищувати 128 символів',
                                                },
                                                onChange: clearServerError,
                                            })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline-secondary"
                                            onClick={() => setShowNewPassword((v) => !v)}
                                            aria-label={
                                                showNewPassword
                                                    ? 'Сховати пароль'
                                                    : 'Показати пароль'
                                            }
                                        >
                                            <i
                                                className={`bi ${showNewPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                                            />
                                        </Button>
                                        <Form.Control.Feedback type="invalid">
                                            {errors.newPassword?.message}
                                        </Form.Control.Feedback>
                                    </InputGroup>
                                    <Form.Text className="text-muted">
                                        Мінімум 8 символів.
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-4" controlId="confirm-password">
                                    <Form.Label>Підтвердіть пароль</Form.Label>
                                    <InputGroup hasValidation>
                                        <Form.Control
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            isInvalid={!!errors.confirmPassword}
                                            {...register('confirmPassword', {
                                                required: 'Підтвердіть новий пароль',
                                                validate: (value, formValues) =>
                                                    value === formValues.newPassword ||
                                                    'Паролі не збігаються',
                                                onChange: clearServerError,
                                            })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline-secondary"
                                            onClick={() => setShowConfirmPassword((v) => !v)}
                                            aria-label={
                                                showConfirmPassword
                                                    ? 'Сховати пароль'
                                                    : 'Показати пароль'
                                            }
                                        >
                                            <i
                                                className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                                            />
                                        </Button>
                                        <Form.Control.Feedback type="invalid">
                                            {errors.confirmPassword?.message}
                                        </Form.Control.Feedback>
                                    </InputGroup>
                                </Form.Group>

                                <Button type="submit" className="w-100" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Spinner
                                                size="sm"
                                                className="me-2"
                                                aria-hidden="true"
                                            />
                                            Збереження…
                                        </>
                                    ) : (
                                        'Зберегти новий пароль'
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
