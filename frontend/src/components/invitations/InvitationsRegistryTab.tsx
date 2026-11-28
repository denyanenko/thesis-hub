import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import type { UserRole } from '../../api/auth';
import {
    resendInvitation,
    revokeInvitation,
    type InvitationLifecycleStatus,
    type InvitationListItem,
    type InvitationListStats,
} from '../../api/invitations';
import {
    EMAIL_STATUS_LABELS,
    EMAIL_STATUS_VARIANTS,
    formatDateTime,
    formatFullName,
    INVITATION_STATUS_LABELS,
    INVITATION_STATUS_VARIANTS,
    SUPERADMIN_LABEL,
    USER_ROLE_BADGE_VARIANTS,
    USER_ROLE_LABELS,
} from './invitationLabels';

interface InvitationsRegistryTabProps {
    items: InvitationListItem[];
    stats: InvitationListStats | undefined;
    loading: boolean;
    error: string | null;
    roleFilter: UserRole | '';
    statusFilter: InvitationLifecycleStatus | '';
    search: string;
    onRoleFilterChange: (role: UserRole | '') => void;
    onStatusFilterChange: (status: InvitationLifecycleStatus | '') => void;
    onSearchChange: (search: string) => void;
    onChanged: (feedback: { variant: 'success' | 'warning'; message: string }) => void;
}

function renderBindingSummary(item: InvitationListItem) {
    if (item.role === 'student') {
        return (
            <div className="small">
                <div className="fw-medium text-break">
                    {item.groupName ?? '—'}
                    {item.educationalProgramName
                        ? ` · ${item.educationalProgramName}`
                        : ''}
                </div>
                {item.studentNumber && (
                    <div className="text-muted">
                        Студ. квиток: <code>{item.studentNumber}</code>
                    </div>
                )}
            </div>
        );
    }

    const orgLabel =
        item.role === 'admin' && item.orgUnitId === null
            ? SUPERADMIN_LABEL
            : item.orgUnitShortName
              ? `${item.orgUnitName ?? ''} (${item.orgUnitShortName})`
              : (item.orgUnitName ?? '—');

    const details = [item.position, item.academicDegree, item.academicTitle]
        .filter((part): part is string => Boolean(part))
        .join(', ');

    return (
        <div className="small">
            <div className="fw-medium text-break">{orgLabel}</div>
            {details && <div className="text-muted text-break">{details}</div>}
        </div>
    );
}

export default function InvitationsRegistryTab({
    items,
    stats,
    loading,
    error,
    roleFilter,
    statusFilter,
    search,
    onRoleFilterChange,
    onStatusFilterChange,
    onSearchChange,
    onChanged,
}: InvitationsRegistryTabProps) {
    const [busyId, setBusyId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [revokeTarget, setRevokeTarget] = useState<InvitationListItem | null>(
        null,
    );

    const handleResend = async (item: InvitationListItem) => {
        setBusyId(item.id);
        setActionError(null);
        try {
            const updated = await resendInvitation(item.id);
            if (updated.emailStatus === 'failed') {
                onChanged({
                    variant: 'warning',
                    message: `Токен для ${updated.email} оновлено, але лист не вдалося надіслати: ${updated.emailError ?? 'помилка SMTP'}.`,
                });
            } else {
                onChanged({
                    variant: 'success',
                    message: `Запрошення повторно надіслано на ${updated.email}.`,
                });
            }
        } catch (err: unknown) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося повторно надіслати запрошення',
            );
        } finally {
            setBusyId(null);
        }
    };

    const handleConfirmRevoke = async () => {
        if (!revokeTarget) return;
        const target = revokeTarget;
        setBusyId(target.id);
        setActionError(null);
        try {
            await revokeInvitation(target.id);
            setRevokeTarget(null);
            onChanged({
                variant: 'success',
                message: `Запрошення для ${target.email} відкликано.`,
            });
        } catch (err: unknown) {
            setActionError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося відкликати запрошення',
            );
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>
            {stats && stats.emailPending > 0 && (
                <Alert
                    variant="info"
                    className="d-flex align-items-center gap-2 py-2 small"
                >
                    <Spinner size="sm" animation="border" />
                    <span>
                        Триває фонова розсилка листів: у черзі ще{' '}
                        <strong>{stats.emailPending}</strong>. Статус
                        оновлюється автоматично…
                    </span>
                </Alert>
            )}

            {actionError && (
                <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setActionError(null)}
                    className="py-2 small"
                >
                    {actionError}
                </Alert>
            )}

            <Card className="mb-3 border-0 shadow-sm">
                <Card.Body>
                    <Row className="g-2 align-items-end">
                        <Col md={5}>
                            <Form.Label className="small text-muted mb-1">
                                Пошук
                            </Form.Label>
                            <Form.Control
                                type="search"
                                placeholder="Email, ПІБ, група, підрозділ або № студентського…"
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                        </Col>
                        <Col sm={6} md={3}>
                            <Form.Label className="small text-muted mb-1">
                                Роль
                            </Form.Label>
                            <Form.Select
                                value={roleFilter}
                                onChange={(e) =>
                                    onRoleFilterChange(
                                        e.target.value as UserRole | '',
                                    )
                                }
                            >
                                <option value="">Усі ролі</option>
                                <option value="student">Студенти</option>
                                <option value="supervisor">
                                    Наукові керівники
                                </option>
                                <option value="admin">Адміністратори</option>
                            </Form.Select>
                        </Col>
                        <Col sm={6} md={4}>
                            <Form.Label className="small text-muted mb-1">
                                Статус
                            </Form.Label>
                            <Form.Select
                                value={statusFilter}
                                onChange={(e) =>
                                    onStatusFilterChange(
                                        e.target.value as
                                            | InvitationLifecycleStatus
                                            | '',
                                    )
                                }
                            >
                                <option value="">Усі статуси</option>
                                <option value="pending">
                                    Очікують активації
                                </option>
                                <option value="accepted">Прийняті</option>
                                <option value="expired">Прострочені</option>
                                <option value="revoked">Відкликані</option>
                            </Form.Select>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {error ? (
                <Alert variant="danger">{error}</Alert>
            ) : loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : items.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="text-center py-5 text-muted">
                        <i className="bi bi-envelope-paper fs-1 d-block mb-2" />
                        Запрошень за обраними фільтрами не знайдено.
                    </Card.Body>
                </Card>
            ) : (
                <>
                    {/* Десктопна таблиця */}
                    <Card className="border-0 shadow-sm d-none d-lg-block">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Користувач</th>
                                    <th>Роль та привʼязка</th>
                                    <th>Статус</th>
                                    <th>Термін / Активація</th>
                                    <th className="text-end">Дії</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => {
                                    const canResend =
                                        item.status === 'pending' ||
                                        item.status === 'expired';
                                    const canRevoke =
                                        item.status === 'pending' ||
                                        item.status === 'expired';
                                    const isBusy = busyId === item.id;

                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="fw-semibold text-break">
                                                    {formatFullName(
                                                        item.lastName,
                                                        item.firstName,
                                                        item.patronymic,
                                                    )}
                                                </div>
                                                <div className="small text-muted text-break">
                                                    {item.email}
                                                </div>
                                            </td>
                                            <td>
                                                <Badge
                                                    bg={
                                                        USER_ROLE_BADGE_VARIANTS[
                                                            item.role
                                                        ]
                                                    }
                                                    className="mb-1"
                                                >
                                                    {
                                                        USER_ROLE_LABELS[
                                                            item.role
                                                        ]
                                                    }
                                                </Badge>
                                                {renderBindingSummary(item)}
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column align-items-start gap-1">
                                                    <Badge
                                                        bg={
                                                            INVITATION_STATUS_VARIANTS[
                                                                item.status
                                                            ]
                                                        }
                                                        text={
                                                            item.status ===
                                                            'pending'
                                                                ? 'dark'
                                                                : undefined
                                                        }
                                                    >
                                                        {
                                                            INVITATION_STATUS_LABELS[
                                                                item.status
                                                            ]
                                                        }
                                                    </Badge>
                                                    <Badge
                                                        bg={
                                                            EMAIL_STATUS_VARIANTS[
                                                                item.emailStatus
                                                            ]
                                                        }
                                                        className="fw-normal"
                                                    >
                                                        {
                                                            EMAIL_STATUS_LABELS[
                                                                item.emailStatus
                                                            ]
                                                        }
                                                    </Badge>
                                                    {item.emailStatus ===
                                                        'failed' &&
                                                        item.emailError && (
                                                            <div className="small text-danger text-break">
                                                                {
                                                                    item.emailError
                                                                }
                                                            </div>
                                                        )}
                                                </div>
                                            </td>
                                            <td className="small text-muted">
                                                {item.acceptedAt ? (
                                                    <div>
                                                        Прийнято:{' '}
                                                        <span className="text-body">
                                                            {formatDateTime(
                                                                item.acceptedAt,
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : item.revokedAt ? (
                                                    <div>
                                                        Відкликано:{' '}
                                                        <span className="text-body">
                                                            {formatDateTime(
                                                                item.revokedAt,
                                                            )}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        Дійсне до:{' '}
                                                        <span className="text-body">
                                                            {formatDateTime(
                                                                item.expiresAt,
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                                {item.invitedByName && (
                                                    <div>
                                                        Ким:{' '}
                                                        {item.invitedByName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-end text-nowrap">
                                                {canResend && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        className="me-1"
                                                        disabled={isBusy}
                                                        onClick={() =>
                                                            handleResend(item)
                                                        }
                                                        title="Перевипустити посилання й надіслати лист повторно"
                                                    >
                                                        {isBusy ? (
                                                            <Spinner size="sm" />
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-arrow-repeat me-1" />
                                                                Повторити
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                                {canRevoke && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        disabled={isBusy}
                                                        onClick={() =>
                                                            setRevokeTarget(
                                                                item,
                                                            )
                                                        }
                                                    >
                                                        <i className="bi bi-x-circle me-1" />
                                                        Відкликати
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </Card>

                    {/* Мобільні картки */}
                    <div className="d-flex flex-column gap-2 d-lg-none">
                        {items.map((item) => {
                            const canAct =
                                item.status === 'pending' ||
                                item.status === 'expired';
                            const isBusy = busyId === item.id;
                            return (
                                <Card
                                    key={item.id}
                                    className="border-0 shadow-sm"
                                >
                                    <Card.Body className="p-3">
                                        <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                                            <div>
                                                <div className="fw-semibold text-break">
                                                    {formatFullName(
                                                        item.lastName,
                                                        item.firstName,
                                                        item.patronymic,
                                                    )}
                                                </div>
                                                <div className="small text-muted text-break">
                                                    {item.email}
                                                </div>
                                            </div>
                                            <div className="d-flex flex-wrap gap-1 align-items-start">
                                                <Badge
                                                    bg={
                                                        USER_ROLE_BADGE_VARIANTS[
                                                            item.role
                                                        ]
                                                    }
                                                >
                                                    {
                                                        USER_ROLE_LABELS[
                                                            item.role
                                                        ]
                                                    }
                                                </Badge>
                                                <Badge
                                                    bg={
                                                        INVITATION_STATUS_VARIANTS[
                                                            item.status
                                                        ]
                                                    }
                                                    text={
                                                        item.status ===
                                                        'pending'
                                                            ? 'dark'
                                                            : undefined
                                                    }
                                                >
                                                    {
                                                        INVITATION_STATUS_LABELS[
                                                            item.status
                                                        ]
                                                    }
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="my-2">
                                            {renderBindingSummary(item)}
                                        </div>

                                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 small text-muted pt-2 border-top">
                                            <div>
                                                <Badge
                                                    bg={
                                                        EMAIL_STATUS_VARIANTS[
                                                            item.emailStatus
                                                        ]
                                                    }
                                                    className="fw-normal me-2"
                                                >
                                                    {
                                                        EMAIL_STATUS_LABELS[
                                                            item.emailStatus
                                                        ]
                                                    }
                                                </Badge>
                                                <span>
                                                    {item.acceptedAt
                                                        ? `Прийнято ${formatDateTime(item.acceptedAt)}`
                                                        : `До ${formatDateTime(item.expiresAt)}`}
                                                </span>
                                            </div>
                                            {canAct && (
                                                <div className="d-flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        disabled={isBusy}
                                                        onClick={() =>
                                                            handleResend(item)
                                                        }
                                                    >
                                                        Повторити
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-danger"
                                                        disabled={isBusy}
                                                        onClick={() =>
                                                            setRevokeTarget(
                                                                item,
                                                            )
                                                        }
                                                    >
                                                        Відкликати
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </Card.Body>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            <Modal
                show={revokeTarget !== null}
                onHide={() => setRevokeTarget(null)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title className="h5">
                        Відкликати запрошення?
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {revokeTarget && (
                        <>
                            Посилання для{' '}
                            <strong>
                                {formatFullName(
                                    revokeTarget.lastName,
                                    revokeTarget.firstName,
                                    revokeTarget.patronymic,
                                )}
                            </strong>{' '}
                            (<code>{revokeTarget.email}</code>) стане недійсним.
                            За потреби ви зможете створити нове запрошення
                            пізніше.
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="outline-secondary"
                        onClick={() => setRevokeTarget(null)}
                        disabled={busyId !== null}
                    >
                        Скасувати
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleConfirmRevoke}
                        disabled={busyId !== null}
                    >
                        {busyId !== null ? (
                            <Spinner size="sm" />
                        ) : (
                            'Відкликати запрошення'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
