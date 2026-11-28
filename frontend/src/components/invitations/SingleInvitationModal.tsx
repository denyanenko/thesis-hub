import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import type { UserRole } from '../../api/auth';
import {
    createInvitation,
    type CreateInvitationPayload,
    type InvitationCatalog,
    type InvitationListItem,
} from '../../api/invitations';
import {
    DEGREE_LEVEL_LABELS,
    SUPERADMIN_LABEL,
    USER_ROLE_LABELS,
} from './invitationLabels';

interface SingleInvitationModalProps {
    show: boolean;
    catalog: InvitationCatalog | undefined;
    defaultRole?: UserRole;
    onHide: () => void;
    onCreated: (created: InvitationListItem) => void;
}

interface SingleFormValues {
    email: string;
    lastName: string;
    firstName: string;
    patronymic: string;
    studentNumber: string;
    groupId: string;
    orgUnitId: string;
    position: string;
    academicDegree: string;
    academicTitle: string;
}

const ROLES: UserRole[] = ['student', 'supervisor', 'admin'];

export default function SingleInvitationModal({
    show,
    catalog,
    defaultRole = 'student',
    onHide,
    onCreated,
}: SingleInvitationModalProps) {
    const [role, setRole] = useState<UserRole>(defaultRole);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SingleFormValues>({
        defaultValues: {
            email: '',
            lastName: '',
            firstName: '',
            patronymic: '',
            studentNumber: '',
            groupId: '',
            orgUnitId: '',
            position: '',
            academicDegree: '',
            academicTitle: '',
        },
    });

    const handleModalEnter = () => {
        setRole(defaultRole);
        setServerError(null);
        reset({
            email: '',
            lastName: '',
            firstName: '',
            patronymic: '',
            studentNumber: '',
            groupId: '',
            orgUnitId:
                defaultRole === 'admin' && catalog?.isSuperAdmin
                    ? '__superadmin__'
                    : '',
            position: '',
            academicDegree: '',
            academicTitle: '',
        });
    };

    const handleRoleChange = (nextRole: UserRole) => {
        setRole(nextRole);
        setServerError(null);
    };

    const onSubmit = async (values: SingleFormValues) => {
        setServerError(null);

        const payload: CreateInvitationPayload = {
            role,
            email: values.email.trim(),
            lastName: values.lastName.trim(),
            firstName: values.firstName.trim(),
            patronymic: values.patronymic.trim() || null,
        };

        if (role === 'student') {
            payload.studentNumber = values.studentNumber.trim();
            payload.groupId = values.groupId ? Number(values.groupId) : null;
        } else if (role === 'supervisor') {
            payload.orgUnitId = values.orgUnitId
                ? Number(values.orgUnitId)
                : null;
            payload.position = values.position.trim() || null;
            payload.academicDegree = values.academicDegree.trim() || null;
            payload.academicTitle = values.academicTitle.trim() || null;
        } else {
            payload.orgUnitId =
                values.orgUnitId && values.orgUnitId !== '__superadmin__'
                    ? Number(values.orgUnitId)
                    : null;
            payload.position = values.position.trim() || null;
        }

        try {
            const created = await createInvitation(payload);
            onCreated(created);
            onHide();
        } catch (err: unknown) {
            setServerError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося створити запрошення',
            );
        }
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            onEnter={handleModalEnter}
            size="lg"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title className="h5">
                    <i className="bi bi-person-plus me-2 text-primary" />
                    Запросити користувача
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Modal.Body>
                    <div className="mb-3">
                        <Form.Label className="d-block small text-muted mb-1">
                            Роль користувача
                        </Form.Label>
                        <ButtonGroup className="w-100 flex-wrap">
                            {ROLES.map((item) => (
                                <Button
                                    key={item}
                                    type="button"
                                    variant={
                                        role === item
                                            ? 'primary'
                                            : 'outline-primary'
                                    }
                                    onClick={() => handleRoleChange(item)}
                                >
                                    {USER_ROLE_LABELS[item]}
                                </Button>
                            ))}
                        </ButtonGroup>
                    </div>

                    {serverError && (
                        <Alert variant="danger" className="py-2 small">
                            {serverError}
                        </Alert>
                    )}

                    <Row className="g-3">
                        <Col xs={12}>
                            <Form.Group controlId="single-invite-email">
                                <Form.Label>
                                    Електронна пошта{' '}
                                    <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    type="email"
                                    placeholder="user@kpi.ua"
                                    isInvalid={!!errors.email}
                                    {...register('email', {
                                        required: 'Вкажіть електронну пошту',
                                        pattern: {
                                            value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
                                            message:
                                                'Вкажіть коректну електронну пошту',
                                        },
                                    })}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.email?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        <Col md={4}>
                            <Form.Group controlId="single-invite-lastname">
                                <Form.Label>
                                    Прізвище{' '}
                                    <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    placeholder="Іваненко"
                                    isInvalid={!!errors.lastName}
                                    {...register('lastName', {
                                        required: 'Вкажіть прізвище',
                                        maxLength: {
                                            value: 100,
                                            message: 'Максимум 100 символів',
                                        },
                                    })}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.lastName?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        <Col md={4}>
                            <Form.Group controlId="single-invite-firstname">
                                <Form.Label>
                                    Імʼя <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Control
                                    placeholder="Іван"
                                    isInvalid={!!errors.firstName}
                                    {...register('firstName', {
                                        required: 'Вкажіть імʼя',
                                        maxLength: {
                                            value: 100,
                                            message: 'Максимум 100 символів',
                                        },
                                    })}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.firstName?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        <Col md={4}>
                            <Form.Group controlId="single-invite-patronymic">
                                <Form.Label>По батькові</Form.Label>
                                <Form.Control
                                    placeholder="Іванович"
                                    isInvalid={!!errors.patronymic}
                                    {...register('patronymic', {
                                        maxLength: {
                                            value: 100,
                                            message: 'Максимум 100 символів',
                                        },
                                    })}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.patronymic?.message}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Col>

                        {role === 'student' && (
                            <>
                                <Col md={5}>
                                    <Form.Group controlId="single-invite-student-number">
                                        <Form.Label>
                                            Номер студентського{' '}
                                            <span className="text-danger">
                                                *
                                            </span>
                                        </Form.Label>
                                        <Form.Control
                                            placeholder="КВ12345678"
                                            isInvalid={!!errors.studentNumber}
                                            {...register('studentNumber', {
                                                validate: (v) =>
                                                    role !== 'student' ||
                                                    v.trim().length > 0 ||
                                                    'Вкажіть номер студентського',
                                            })}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.studentNumber?.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>

                                <Col md={7}>
                                    <Form.Group controlId="single-invite-group">
                                        <Form.Label>
                                            Академічна група{' '}
                                            <span className="text-danger">
                                                *
                                            </span>
                                        </Form.Label>
                                        <Form.Select
                                            isInvalid={!!errors.groupId}
                                            {...register('groupId', {
                                                validate: (v) =>
                                                    role !== 'student' ||
                                                    v.length > 0 ||
                                                    'Оберіть академічну групу',
                                            })}
                                        >
                                            <option value="">
                                                — Оберіть групу —
                                            </option>
                                            {catalog?.groups.map((g) => (
                                                <option
                                                    key={g.id}
                                                    value={String(g.id)}
                                                >
                                                    {g.name} —{' '}
                                                    {g.educationalProgramName} (
                                                    {
                                                        DEGREE_LEVEL_LABELS[
                                                            g.degreeLevel
                                                        ]
                                                    }
                                                    )
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Form.Control.Feedback type="invalid">
                                            {errors.groupId?.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>
                            </>
                        )}

                        {role === 'supervisor' && (
                            <>
                                <Col xs={12}>
                                    <Form.Group controlId="single-invite-department">
                                        <Form.Label>
                                            Кафедра{' '}
                                            <span className="text-danger">
                                                *
                                            </span>
                                        </Form.Label>
                                        <Form.Select
                                            isInvalid={!!errors.orgUnitId}
                                            {...register('orgUnitId', {
                                                validate: (v) =>
                                                    role !== 'supervisor' ||
                                                    (v.length > 0 &&
                                                        v !==
                                                            '__superadmin__') ||
                                                    'Оберіть кафедру',
                                            })}
                                        >
                                            <option value="">
                                                — Оберіть кафедру —
                                            </option>
                                            {catalog?.departments.map((d) => (
                                                <option
                                                    key={d.id}
                                                    value={String(d.id)}
                                                >
                                                    {d.name}
                                                    {d.shortName
                                                        ? ` (${d.shortName})`
                                                        : ''}{' '}
                                                    — {d.orgPath}
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Form.Control.Feedback type="invalid">
                                            {errors.orgUnitId?.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group controlId="single-invite-sup-position">
                                        <Form.Label>Посада</Form.Label>
                                        <Form.Control
                                            placeholder="Доцент"
                                            {...register('position')}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group controlId="single-invite-degree">
                                        <Form.Label>
                                            Науковий ступінь
                                        </Form.Label>
                                        <Form.Control
                                            placeholder="к.т.н. / PhD"
                                            {...register('academicDegree')}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={4}>
                                    <Form.Group controlId="single-invite-title">
                                        <Form.Label>Вчене звання</Form.Label>
                                        <Form.Control
                                            placeholder="доцент / професор"
                                            {...register('academicTitle')}
                                        />
                                    </Form.Group>
                                </Col>
                            </>
                        )}

                        {role === 'admin' && (
                            <>
                                <Col md={7}>
                                    <Form.Group controlId="single-invite-orgunit">
                                        <Form.Label>
                                            Структурний підрозділ{' '}
                                            {!catalog?.isSuperAdmin && (
                                                <span className="text-danger">
                                                    *
                                                </span>
                                            )}
                                        </Form.Label>
                                        <Form.Select
                                            isInvalid={!!errors.orgUnitId}
                                            {...register('orgUnitId', {
                                                validate: (v) => {
                                                    if (role !== 'admin') {
                                                        return true;
                                                    }
                                                    if (catalog?.isSuperAdmin) {
                                                        return true;
                                                    }
                                                    return (
                                                        (v.length > 0 &&
                                                            v !==
                                                                '__superadmin__') ||
                                                        'Оберіть підрозділ'
                                                    );
                                                },
                                            })}
                                        >
                                            {catalog?.isSuperAdmin ? (
                                                <option value="__superadmin__">
                                                    {SUPERADMIN_LABEL}
                                                </option>
                                            ) : (
                                                <option value="">
                                                    — Оберіть підрозділ —
                                                </option>
                                            )}
                                            {catalog?.orgUnits.map((u) => (
                                                <option
                                                    key={u.id}
                                                    value={String(u.id)}
                                                >
                                                    {u.orgPath} — {u.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Form.Control.Feedback type="invalid">
                                            {errors.orgUnitId?.message}
                                        </Form.Control.Feedback>
                                    </Form.Group>
                                </Col>

                                <Col md={5}>
                                    <Form.Group controlId="single-invite-admin-position">
                                        <Form.Label>Посада</Form.Label>
                                        <Form.Control
                                            placeholder="Заступник декана"
                                            {...register('position')}
                                        />
                                    </Form.Group>
                                </Col>
                            </>
                        )}
                    </Row>
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="outline-secondary"
                        onClick={onHide}
                        disabled={isSubmitting}
                    >
                        Скасувати
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
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
                            <>
                                <i className="bi bi-send me-1" />
                                Надіслати запрошення
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
