import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import type { UserRole } from '../api/auth';
import {
    fetchInvitationCatalog,
    fetchInvitations,
    INVITATION_CATALOG_KEY,
    INVITATIONS_KEY,
    type BulkCreateResponse,
    type InvitationLifecycleStatus,
    type InvitationListItem,
} from '../api/invitations';
import BulkInvitationsTab from '../components/invitations/BulkInvitationsTab';
import InvitationsRegistryTab from '../components/invitations/InvitationsRegistryTab';
import SingleInvitationModal from '../components/invitations/SingleInvitationModal';

type ActiveTab = 'registry' | 'bulk';

interface FeedbackBanner {
    variant: 'success' | 'warning';
    message: string;
}

export default function InvitationsPage() {
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<ActiveTab>('registry');
    const [showSingleModal, setShowSingleModal] = useState(false);
    const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
    const [statusFilter, setStatusFilter] = useState<
        InvitationLifecycleStatus | ''
    >('');
    const [search, setSearch] = useState('');
    const [feedback, setFeedback] = useState<FeedbackBanner | null>(null);

    const catalogQuery = useQuery({
        queryKey: INVITATION_CATALOG_KEY,
        queryFn: fetchInvitationCatalog,
        staleTime: 60_000,
    });

    const invitationsQuery = useQuery({
        queryKey: [
            ...INVITATIONS_KEY,
            { role: roleFilter, status: statusFilter, search },
        ],
        queryFn: () =>
            fetchInvitations({
                role: roleFilter,
                status: statusFilter,
                search,
            }),
        // Автоматично оновлюємо реєстр, доки триває фонова відправка листів
        refetchInterval: (query) => {
            const pendingCount = query.state.data?.stats.emailPending ?? 0;
            return pendingCount > 0 ? 3000 : false;
        },
    });

    const stats = invitationsQuery.data?.stats;

    const refreshInvitations = () => {
        void queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY });
    };

    const handleSingleCreated = (created: InvitationListItem) => {
        refreshInvitations();
        setActiveTab('registry');
        if (created.emailStatus === 'failed') {
            setFeedback({
                variant: 'warning',
                message: `Запрошення для ${created.email} збережено, але лист не вдалося надіслати (${created.emailError ?? 'помилка SMTP'}). Ви можете натиснути «Повторити» у реєстрі.`,
            });
        } else {
            setFeedback({
                variant: 'success',
                message: `Запрошення успішно надіслано на ${created.email}.`,
            });
        }
    };

    const handleBulkCreated = (result: BulkCreateResponse) => {
        refreshInvitations();
        const failedNow = result.created.filter(
            (item) => item.emailStatus === 'failed',
        ).length;
        const queuedNow = result.created.filter(
            (item) => item.emailStatus === 'pending',
        ).length;

        if (failedNow > 0) {
            setFeedback({
                variant: 'warning',
                message: `Створено ${result.createdCount} запрошень, але для ${failedNow} не вдалося надіслати лист. Перевірте статус у «Реєстрі запрошень» та повторіть відправку.`,
            });
        } else if (queuedNow > 0) {
            setFeedback({
                variant: 'success',
                message: `Створено ${result.createdCount} запрошень — листи поставлено в чергу на відправку.${result.skippedCount > 0 ? ` Пропущено рядків із помилками: ${result.skippedCount}.` : ''}`,
            });
        } else {
            setFeedback({
                variant: 'success',
                message: `Успішно створено та надіслано ${result.createdCount} запрошень.${result.skippedCount > 0 ? ` Пропущено рядків із помилками: ${result.skippedCount}.` : ''}`,
            });
        }

        if (result.skippedCount === 0) {
            setActiveTab('registry');
        }
    };

    return (
        <Container className="py-4">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                <div>
                    <h1 className="h3 mb-1">Запрошення користувачів</h1>
                    <p className="text-muted mb-0">
                        Одиночне та масове запрошення студентів, наукових
                        керівників і адміністраторів через електронну пошту
                    </p>
                </div>

                <div className="d-flex flex-wrap gap-2">
                    <Button
                        variant="outline-primary"
                        onClick={() => setActiveTab('bulk')}
                    >
                        <i className="bi bi-file-earmark-spreadsheet me-1" />
                        Масовий імпорт
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setShowSingleModal(true)}
                    >
                        <i className="bi bi-person-plus me-1" />
                        Запросити користувача
                    </Button>
                </div>
            </div>

            {stats && (
                <Row className="g-2 mb-4">
                    <Col xs={6} sm={4} lg={2}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="py-2 px-3">
                                <div className="small text-muted">Усього</div>
                                <div className="h5 mb-0">{stats.total}</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={6} sm={4} lg={2}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="py-2 px-3">
                                <div className="small text-muted">Очікують</div>
                                <div className="h5 mb-0 text-warning-emphasis">
                                    {stats.pending}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={6} sm={4} lg={2}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="py-2 px-3">
                                <div className="small text-muted">Прийнято</div>
                                <div className="h5 mb-0 text-success">
                                    {stats.accepted}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={6} sm={4} lg={2}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="py-2 px-3">
                                <div className="small text-muted">
                                    Прострочено
                                </div>
                                <div className="h5 mb-0 text-secondary">
                                    {stats.expired}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={6} sm={4} lg={2}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="py-2 px-3">
                                <div className="small text-muted">
                                    Відкликано
                                </div>
                                <div className="h5 mb-0 text-danger">
                                    {stats.revoked}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={6} sm={4} lg={2}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body className="py-2 px-3">
                                <div className="small text-muted">
                                    Помилка листа
                                </div>
                                <div className="h5 mb-0 text-danger">
                                    {stats.emailFailed}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {feedback && (
                <Alert
                    variant={feedback.variant}
                    dismissible
                    onClose={() => setFeedback(null)}
                    className="mb-3"
                >
                    {feedback.message}
                </Alert>
            )}

            <Nav variant="tabs" className="mb-3">
                <Nav.Item>
                    <Nav.Link
                        active={activeTab === 'registry'}
                        onClick={() => setActiveTab('registry')}
                    >
                        <i className="bi bi-list-check me-1" />
                        Реєстр запрошень
                        {stats && stats.pending > 0 && (
                            <Badge
                                bg="warning"
                                text="dark"
                                pill
                                className="ms-2"
                            >
                                {stats.pending}
                            </Badge>
                        )}
                    </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link
                        active={activeTab === 'bulk'}
                        onClick={() => setActiveTab('bulk')}
                    >
                        <i className="bi bi-table me-1" />
                        Масове додавання (Excel / CSV / Таблиця)
                    </Nav.Link>
                </Nav.Item>
            </Nav>

            {activeTab === 'registry' ? (
                <InvitationsRegistryTab
                    items={invitationsQuery.data?.items ?? []}
                    stats={stats}
                    loading={invitationsQuery.isPending}
                    error={
                        invitationsQuery.error instanceof Error
                            ? invitationsQuery.error.message
                            : null
                    }
                    roleFilter={roleFilter}
                    statusFilter={statusFilter}
                    search={search}
                    onRoleFilterChange={setRoleFilter}
                    onStatusFilterChange={setStatusFilter}
                    onSearchChange={setSearch}
                    onChanged={(banner) => {
                        setFeedback(banner);
                        refreshInvitations();
                    }}
                />
            ) : (
                <BulkInvitationsTab
                    catalog={catalogQuery.data}
                    onBulkCreated={handleBulkCreated}
                />
            )}

            <SingleInvitationModal
                show={showSingleModal}
                catalog={catalogQuery.data}
                onHide={() => setShowSingleModal(false)}
                onCreated={handleSingleCreated}
            />
        </Container>
    );
}
