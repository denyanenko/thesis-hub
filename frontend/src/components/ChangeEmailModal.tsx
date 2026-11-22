import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import { requestEmailChange } from '../api/auth';

interface ChangeEmailFormValues {
    newEmail: string;
    currentPassword: string;
}

interface ChangeEmailModalProps {
    show: boolean;
    currentEmail: string;
    onHide: () => void;
}

export default function ChangeEmailModal({
    show,
    currentEmail,
    onHide,
}: ChangeEmailModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangeEmailFormValues>();

    const [serverError, setServerError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleClose = () => {
        if (isSubmitting) return;
        reset();
        setServerError(null);
        setSuccessMessage(null);
        setShowPassword(false);
        onHide();
    };

    const clearServerError = () => setServerError(null);

    const onSubmit = async (values: ChangeEmailFormValues) => {
        setServerError(null);
        try {
            const message = await requestEmailChange(
                values.newEmail.trim(),
                values.currentPassword,
            );
            setSuccessMessage(message);
        } catch (err) {
            setServerError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося надіслати запит на зміну пошти',
            );
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton={!isSubmitting}>
                <Modal.Title className="h5">📧 Зміна електронної пошти</Modal.Title>
            </Modal.Header>

            {successMessage ? (
                <>
                    <Modal.Body>
                        <Alert variant="success" className="py-2">
                            {successMessage}
                        </Alert>
                        <p className="text-muted small mb-0">
                            Перейдіть за посиланням у листі протягом 1 години, щоб
                            підтвердити нову адресу. Після підтвердження всі активні
                            сеанси буде завершено, а на стару пошту надійде сповіщення
                            безпеки.
                        </p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="button" variant="primary" onClick={handleClose}>
                            Зрозуміло
                        </Button>
                    </Modal.Footer>
                </>
            ) : (
                <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Modal.Body>
                        <p className="text-muted small mb-3">
                            Поточна адреса: <strong>{currentEmail}</strong>. На нову пошту
                            надійде лист для підтвердження.
                        </p>

                        {serverError && (
                            <Alert variant="danger" className="py-2">
                                {serverError}
                            </Alert>
                        )}

                        <Form.Group className="mb-3" controlId="change-new-email">
                            <Form.Label>Новий email</Form.Label>
                            <Form.Control
                                type="email"
                                autoComplete="email"
                                autoFocus
                                isInvalid={!!errors.newEmail}
                                {...register('newEmail', {
                                    required: 'Введіть новий email',
                                    pattern: {
                                        value: /^\S+@\S+\.\S+$/,
                                        message: 'Некоректний email',
                                    },
                                    validate: (value) =>
                                        value.trim().toLowerCase() !==
                                            currentEmail.toLowerCase() ||
                                        'Новий email має відрізнятися від поточного',
                                    onChange: clearServerError,
                                })}
                            />
                            <Form.Control.Feedback type="invalid">
                                {errors.newEmail?.message}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group controlId="change-email-password">
                            <Form.Label>Поточний пароль</Form.Label>
                            <InputGroup hasValidation>
                                <Form.Control
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    isInvalid={!!errors.currentPassword}
                                    {...register('currentPassword', {
                                        required: 'Введіть поточний пароль для підтвердження',
                                        onChange: clearServerError,
                                    })}
                                />
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={
                                        showPassword ? 'Сховати пароль' : 'Показати пароль'
                                    }
                                >
                                    <i
                                        className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                                    />
                                </Button>
                                <Form.Control.Feedback type="invalid">
                                    {errors.currentPassword?.message}
                                </Form.Control.Feedback>
                            </InputGroup>
                        </Form.Group>
                    </Modal.Body>

                    <Modal.Footer>
                        <Button
                            type="button"
                            variant="outline-secondary"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Скасувати
                        </Button>
                        <Button type="submit" variant="primary" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Spinner size="sm" className="me-2" aria-hidden="true" />
                                    Надсилання…
                                </>
                            ) : (
                                'Надіслати підтвердження'
                            )}
                        </Button>
                    </Modal.Footer>
                </Form>
            )}
        </Modal>
    );
}
