import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import { changePassword } from '../api/auth';

interface ChangePasswordFormValues {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface ChangePasswordModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess: (message: string) => void;
}

export default function ChangePasswordModal({
    show,
    onHide,
    onSuccess,
}: ChangePasswordModalProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordFormValues>();

    const [serverError, setServerError] = useState<string | null>(null);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleClose = () => {
        if (isSubmitting) return;
        reset();
        setServerError(null);
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        onHide();
    };

    const clearServerError = () => setServerError(null);

    const onSubmit = async (values: ChangePasswordFormValues) => {
        setServerError(null);
        try {
            const message = await changePassword(
                values.currentPassword,
                values.newPassword,
            );
            reset();
            setShowCurrent(false);
            setShowNew(false);
            setShowConfirm(false);
            onSuccess(message);
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : 'Не вдалося змінити пароль',
            );
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton={!isSubmitting}>
                <Modal.Title className="h5">🔒 Зміна пароля</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Modal.Body>
                    <p className="text-muted small mb-3">
                        Поточний сеанс залишиться активним, а всі інші пристрої буде
                        розлогінено. На вашу пошту надійде сповіщення про зміну.
                    </p>

                    {serverError && (
                        <Alert variant="danger" className="py-2">
                            {serverError}
                        </Alert>
                    )}

                    <Form.Group className="mb-3" controlId="change-current-password">
                        <Form.Label>Поточний пароль</Form.Label>
                        <InputGroup hasValidation>
                            <Form.Control
                                type={showCurrent ? 'text' : 'password'}
                                autoComplete="current-password"
                                autoFocus
                                isInvalid={!!errors.currentPassword}
                                {...register('currentPassword', {
                                    required: 'Введіть поточний пароль',
                                    onChange: clearServerError,
                                })}
                            />
                            <Button
                                type="button"
                                variant="outline-secondary"
                                onClick={() => setShowCurrent((v) => !v)}
                                aria-label={
                                    showCurrent ? 'Сховати пароль' : 'Показати пароль'
                                }
                            >
                                <i
                                    className={`bi ${showCurrent ? 'bi-eye-slash' : 'bi-eye'}`}
                                />
                            </Button>
                            <Form.Control.Feedback type="invalid">
                                {errors.currentPassword?.message}
                            </Form.Control.Feedback>
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="change-new-password">
                        <Form.Label>Новий пароль</Form.Label>
                        <InputGroup hasValidation>
                            <Form.Control
                                type={showNew ? 'text' : 'password'}
                                autoComplete="new-password"
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
                                    validate: (value, formValues) =>
                                        value !== formValues.currentPassword ||
                                        'Новий пароль повинен відрізнятися від поточного',
                                    onChange: clearServerError,
                                })}
                            />
                            <Button
                                type="button"
                                variant="outline-secondary"
                                onClick={() => setShowNew((v) => !v)}
                                aria-label={showNew ? 'Сховати пароль' : 'Показати пароль'}
                            >
                                <i
                                    className={`bi ${showNew ? 'bi-eye-slash' : 'bi-eye'}`}
                                />
                            </Button>
                            <Form.Control.Feedback type="invalid">
                                {errors.newPassword?.message}
                            </Form.Control.Feedback>
                        </InputGroup>
                        <Form.Text className="text-muted">Мінімум 8 символів.</Form.Text>
                    </Form.Group>

                    <Form.Group controlId="change-confirm-password">
                        <Form.Label>Підтвердіть новий пароль</Form.Label>
                        <InputGroup hasValidation>
                            <Form.Control
                                type={showConfirm ? 'text' : 'password'}
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
                                onClick={() => setShowConfirm((v) => !v)}
                                aria-label={
                                    showConfirm ? 'Сховати пароль' : 'Показати пароль'
                                }
                            >
                                <i
                                    className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}
                                />
                            </Button>
                            <Form.Control.Feedback type="invalid">
                                {errors.confirmPassword?.message}
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
                                Збереження…
                            </>
                        ) : (
                            'Змінити пароль'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
