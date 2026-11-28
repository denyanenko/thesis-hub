import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Spinner from 'react-bootstrap/Spinner';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchMe, ME_KEY } from '../api/auth';
import { acceptInvitation, verifyInvitation } from '../api/invitations';
import { PROFILE_KEY } from '../api/profile';
import {
    formatDateTime,
    formatFullName,
    USER_ROLE_BADGE_VARIANTS,
} from '../components/invitations/invitationLabels';

interface AcceptFormValues {
    password: string;
    confirmPassword: string;
}

export default function AcceptInvitationPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token')?.trim() ?? '';

    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<AcceptFormValues>();

    const verifyQuery = useQuery({
        queryKey: ['invitation-verify', token],
        queryFn: () => verifyInvitation(token),
        enabled: Boolean(token),
        retry: false,
        refetchOnWindowFocus: false,
    });

    const invitation = verifyQuery.data ?? null;
    const verifying = Boolean(token) && verifyQuery.isPending;
    const verifyError = !token
        ? 'Посилання-запрошення відсутнє або некоректне.'
        : verifyQuery.error instanceof Error
          ? verifyQuery.error.message
          : verifyQuery.isError
            ? 'Не вдалося перевірити запрошення'
            : null;

    const onSubmit = async (values: AcceptFormValues) => {
        setSubmitError(null);
        try {
            await acceptInvitation(token, values.password);
            const me = await fetchMe();
            queryClient.setQueryData(ME_KEY, me);
            await queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
            navigate('/profile', { replace: true });
        } catch (err: unknown) {
            setSubmitError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося активувати акаунт',
            );
        }
    };

    return (
        <Container className="py-5">
            <Card className="auth-card mx-auto shadow-sm">
                <Card.Body className="p-4">
                    <h1 className="h4 mb-3 text-center">
                        <i className="bi bi-envelope-check me-2 text-primary" />
                        Активація акаунта
                    </h1>

                    {verifying ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="primary" />
                            <div className="text-muted small mt-2">
                                Перевірка запрошення…
                            </div>
                        </div>
                    ) : verifyError || !invitation ? (
                        <>
                            <Alert variant="danger" className="py-2">
                                {verifyError ??
                                    'Посилання-запрошення недійсне або застаріло.'}
                            </Alert>
                            <div className="d-grid">
                                <Link to="/login" className="btn btn-primary">
                                    Перейти на сторінку входу
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-body-tertiary border rounded p-3 mb-4 small">
                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                                    <span className="fw-semibold fs-6">
                                        {formatFullName(
                                            invitation.lastName,
                                            invitation.firstName,
                                            invitation.patronymic,
                                        )}
                                    </span>
                                    <Badge
                                        bg={
                                            USER_ROLE_BADGE_VARIANTS[
                                                invitation.role
                                            ]
                                        }
                                    >
                                        {invitation.roleLabel}
                                    </Badge>
                                </div>

                                <div className="text-muted mb-1">
                                    <i className="bi bi-envelope me-1" />
                                    {invitation.email}
                                </div>

                                {invitation.role === 'student' && (
                                    <>
                                        {invitation.groupName && (
                                            <div className="text-muted mb-1">
                                                <i className="bi bi-people me-1" />
                                                Група{' '}
                                                <strong>
                                                    {invitation.groupName}
                                                </strong>
                                                {invitation.educationalProgramName
                                                    ? ` — ${invitation.educationalProgramName}`
                                                    : ''}
                                            </div>
                                        )}
                                        {invitation.studentNumber && (
                                            <div className="text-muted mb-1">
                                                <i className="bi bi-person-vcard me-1" />
                                                Студентський квиток:{' '}
                                                <code>
                                                    {invitation.studentNumber}
                                                </code>
                                            </div>
                                        )}
                                    </>
                                )}

                                {invitation.role !== 'student' &&
                                    invitation.orgUnitName && (
                                        <div className="text-muted mb-1">
                                            <i className="bi bi-building me-1" />
                                            {invitation.orgUnitName}
                                        </div>
                                    )}

                                {invitation.position && (
                                    <div className="text-muted mb-1">
                                        <i className="bi bi-briefcase me-1" />
                                        {invitation.position}
                                        {invitation.academicDegree
                                            ? `, ${invitation.academicDegree}`
                                            : ''}
                                        {invitation.academicTitle
                                            ? `, ${invitation.academicTitle}`
                                            : ''}
                                    </div>
                                )}

                                <div className="text-muted mt-2 pt-2 border-top">
                                    <i className="bi bi-clock me-1" />
                                    Запрошення дійсне до{' '}
                                    {formatDateTime(invitation.expiresAt)}
                                </div>
                            </div>

                            {submitError && (
                                <Alert variant="danger" className="py-2">
                                    {submitError}
                                </Alert>
                            )}

                            <Form
                                onSubmit={handleSubmit(onSubmit)}
                                noValidate
                            >
                                <Form.Group
                                    className="mb-3"
                                    controlId="invite-password"
                                >
                                    <Form.Label>
                                        Придумайте пароль для входу
                                    </Form.Label>
                                    <InputGroup hasValidation>
                                        <Form.Control
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            autoComplete="new-password"
                                            autoFocus
                                            isInvalid={!!errors.password}
                                            {...register('password', {
                                                required: 'Введіть пароль',
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
                                                onChange: () =>
                                                    setSubmitError(null),
                                            })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline-secondary"
                                            onClick={() =>
                                                setShowPassword((v) => !v)
                                            }
                                            aria-label={
                                                showPassword
                                                    ? 'Сховати пароль'
                                                    : 'Показати пароль'
                                            }
                                        >
                                            <i
                                                className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}
                                            />
                                        </Button>
                                        <Form.Control.Feedback type="invalid">
                                            {errors.password?.message}
                                        </Form.Control.Feedback>
                                    </InputGroup>
                                    <Form.Text className="text-muted">
                                        Мінімум 8 символів.
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group
                                    className="mb-4"
                                    controlId="invite-confirm-password"
                                >
                                    <Form.Label>Підтвердіть пароль</Form.Label>
                                    <InputGroup hasValidation>
                                        <Form.Control
                                            type={
                                                showConfirmPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            autoComplete="new-password"
                                            isInvalid={!!errors.confirmPassword}
                                            {...register('confirmPassword', {
                                                required:
                                                    'Підтвердіть пароль',
                                                validate: (value, formValues) =>
                                                    value ===
                                                        formValues.password ||
                                                    'Паролі не збігаються',
                                                onChange: () =>
                                                    setSubmitError(null),
                                            })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline-secondary"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    (v) => !v,
                                                )
                                            }
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

                                <Button
                                    type="submit"
                                    className="w-100"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner
                                                size="sm"
                                                className="me-2"
                                                aria-hidden="true"
                                            />
                                            Активація акаунта…
                                        </>
                                    ) : (
                                        'Активувати акаунт та увійти'
                                    )}
                                </Button>
                            </Form>

                            <div className="text-center mt-3">
                                <Link
                                    to="/login"
                                    className="small text-decoration-none"
                                >
                                    Уже маєте акаунт? Увійти
                                </Link>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}
