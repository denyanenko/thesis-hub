import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import {
    SPECIALTIES_KEY,
    activateSpecialty,
    fetchSpecialties,
    type SpecialtyItem,
} from '../api/specialties';
import { EDUCATIONAL_PROGRAMS_KEY } from '../api/educationalPrograms';
import SpecialtyFormModal from '../components/specialties/SpecialtyFormModal';
import ReplaceSpecialtyModal from '../components/specialties/ReplaceSpecialtyModal';
import ConfirmSpecialtyActionModal from '../components/specialties/ConfirmSpecialtyActionModal';
import {
    getBranchLabel,
    getSpecialtyBranchKey,
    getSpecialtyCodeStyle,
} from '../components/specialties/branchColors';

type StatusFilter = 'active' | 'all' | 'inactive' | 'replaced';

type FormModalState =
    | { mode: 'create' }
    | { mode: 'edit'; specialty: SpecialtyItem }
    | null;

type ConfirmModalState = {
    action: 'deactivate' | 'delete';
    specialty: SpecialtyItem;
} | null;

const VALID_STATUS_FILTERS: readonly StatusFilter[] = [
    'active',
    'all',
    'inactive',
    'replaced',
];

function parseStatusFilter(value: string | null): StatusFilter {
    if (value && (VALID_STATUS_FILTERS as readonly string[]).includes(value)) {
        return value as StatusFilter;
    }
    return 'active';
}

function formatDateUk(iso: string | null): string | null {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export default function SpecialtiesPage() {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const statusFilter = parseStatusFilter(searchParams.get('status'));
    const branchFilter = searchParams.get('branch') || 'ALL';
    const searchQuery = searchParams.get('q') ?? '';

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [activatingId, setActivatingId] = useState<number | null>(null);

    const [formModal, setFormModal] = useState<FormModalState>(null);
    const [replacingSpecialty, setReplacingSpecialty] = useState<SpecialtyItem | null>(null);
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null);

    const updateSearchParams = useCallback(
        (updater: (next: URLSearchParams) => void) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    updater(next);
                    return next;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );

    const setStatusFilter = (nextStatus: StatusFilter) => {
        updateSearchParams((next) => {
            if (nextStatus === 'active') next.delete('status');
            else next.set('status', nextStatus);
        });
    };

    const setBranchFilter = (nextBranch: string) => {
        updateSearchParams((next) => {
            if (nextBranch === 'ALL') next.delete('branch');
            else next.set('branch', nextBranch);
        });
    };

    const setSearchQuery = (nextQuery: string) => {
        updateSearchParams((next) => {
            if (!nextQuery) next.delete('q');
            else next.set('q', nextQuery);
        });
    };

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: [...SPECIALTIES_KEY, true],
        queryFn: () => fetchSpecialties(true),
    });

    const specialties = useMemo(() => data?.specialties ?? [], [data]);
    const actor = data?.actor;

    const counts = useMemo(() => {
        let active = 0;
        let inactive = 0;
        let replaced = 0;
        for (const s of specialties) {
            if (s.isActive) {
                active += 1;
            } else {
                inactive += 1;
                if (s.replacedById !== null) replaced += 1;
            }
        }
        return { total: specialties.length, active, inactive, replaced };
    }, [specialties]);

    const availableBranches = useMemo(() => {
        const present = new Set<string>();
        for (const s of specialties) {
            present.add(getSpecialtyBranchKey(s.code));
        }
        return [...present].sort((a, b) => {
            const aLetter = /^[A-Z]/.test(a);
            const bLetter = /^[A-Z]/.test(b);
            if (aLetter !== bLetter) return aLetter ? -1 : 1;
            return a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' });
        });
    }, [specialties]);

    const filteredSpecialties = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return specialties.filter((s) => {
            if (statusFilter === 'active' && !s.isActive) return false;
            if (statusFilter === 'inactive' && s.isActive) return false;
            if (statusFilter === 'replaced' && s.replacedById === null) return false;

            if (branchFilter !== 'ALL' && getSpecialtyBranchKey(s.code) !== branchFilter) {
                return false;
            }

            if (q) {
                const matchesSelf =
                    s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
                const matchesReplacement =
                    s.replacedBy !== null &&
                    (s.replacedBy.code.toLowerCase().includes(q) ||
                        s.replacedBy.name.toLowerCase().includes(q));
                const matchesPredecessor = s.replacedFrom.some(
                    (prev) =>
                        prev.code.toLowerCase().includes(q) ||
                        prev.name.toLowerCase().includes(q),
                );
                if (!matchesSelf && !matchesReplacement && !matchesPredecessor) {
                    return false;
                }
            }

            return true;
        });
    }, [specialties, statusFilter, branchFilter, searchQuery]);

    const invalidateSpecialties = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: SPECIALTIES_KEY }),
            queryClient.invalidateQueries({ queryKey: EDUCATIONAL_PROGRAMS_KEY }),
        ]);
    };

    const handleActionSuccess = async (message: string) => {
        setActionError(null);
        await invalidateSpecialties();
        setSuccessMessage(message);
    };

    const handleActivate = async (specialty: SpecialtyItem) => {
        setActionError(null);
        setActivatingId(specialty.id);
        try {
            await activateSpecialty(specialty.id);
            await handleActionSuccess(
                `Спеціальність «${specialty.code} — ${specialty.name}» активовано.`,
            );
        } catch (err) {
            setActionError(
                err instanceof Error ? err.message : 'Не вдалося активувати спеціальність',
            );
        } finally {
            setActivatingId(null);
        }
    };

    const handleJumpToCode = (code: string) => {
        setSearchParams(
            new URLSearchParams({
                status: 'all',
                q: code,
            }),
            { replace: true },
        );
    };

    const renderCodeBadge = (code: string, isActive: boolean) => (
        <span
            className="badge font-monospace specialty-code-badge"
            style={getSpecialtyCodeStyle(code, isActive)}
        >
            {code}
        </span>
    );

    const renderStatusBadge = (s: SpecialtyItem) => {
        if (s.isActive) {
            return <Badge bg="success">Активна</Badge>;
        }
        if (s.replacedBy) {
            return (
                <Badge bg="warning" text="dark">
                    Замінена
                </Badge>
            );
        }
        return <Badge bg="secondary">Неактивна</Badge>;
    };

    const renderProgramsCountLink = (s: SpecialtyItem, compact = false) => {
        const hasActive = s.counts.activePrograms > 0;
        const hasArchivedOnly = !hasActive && s.counts.programs > 0;
        const displayCount =
            !s.isActive && hasArchivedOnly ? s.counts.programs : s.counts.activePrograms;
        const to = `/admin/educational-programs?specialtyId=${s.id}${
            hasArchivedOnly ? '&status=all' : ''
        }`;
        const title = hasActive
            ? `Перейти до активних освітніх програм спеціальності ${s.code} (${s.counts.activePrograms})`
            : hasArchivedOnly
              ? `Перейти до освітніх програм спеціальності ${s.code}`
              : `Освітні програми спеціальності ${s.code} (поки немає)`;

        if (s.counts.programs === 0 && !s.isActive) {
            return (
                <span className="small text-muted" title="Освітніх програм немає">
                    {compact ? 'ОП: 0' : '0'}
                </span>
            );
        }

        return (
            <Link
                to={to}
                className={`small entity-link text-nowrap ${
                    displayCount > 0 ? 'text-primary' : 'text-muted'
                }`}
                title={title}
            >
                {compact && 'ОП: '}
                {displayCount > 0 ? <strong>{displayCount}</strong> : <span>0</span>}
                {displayCount > 0 && (
                    <i
                        className="bi bi-arrow-up-right ms-1"
                        style={{ fontSize: '0.65rem' }}
                        aria-hidden="true"
                    />
                )}
            </Link>
        );
    };

    const renderSuccessionMeta = (s: SpecialtyItem) => {
        const deactivatedDate = formatDateUk(s.deactivatedAt);
        const showChainEnd =
            s.currentReplacement !== null &&
            s.replacedBy !== null &&
            s.currentReplacement.id !== s.replacedBy.id;

        return (
            <div className="d-flex flex-column gap-1 mt-1">
                {s.replacedBy && (
                    <div className="small text-muted d-flex flex-wrap align-items-center gap-1">
                        <span>Перекодовано:</span>
                        <span className="font-monospace fw-semibold text-dark">{s.code}</span>
                        <i className="bi bi-arrow-right text-primary" />
                        <Button
                            variant="link"
                            size="sm"
                            className="p-0 align-baseline text-decoration-none font-monospace fw-semibold"
                            onClick={() => handleJumpToCode(s.replacedBy!.code)}
                            title={`Перейти до ${s.replacedBy.code} — ${s.replacedBy.name}`}
                        >
                            {s.replacedBy.code}
                        </Button>
                        <span className="text-muted">({s.replacedBy.name})</span>
                        {showChainEnd && s.currentReplacement && (
                            <>
                                <i className="bi bi-arrow-right text-primary" />
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 align-baseline text-decoration-none font-monospace fw-semibold"
                                    onClick={() => handleJumpToCode(s.currentReplacement!.code)}
                                    title={`Актуальний правонаступник: ${s.currentReplacement.code} — ${s.currentReplacement.name}`}
                                >
                                    {s.currentReplacement.code}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {s.replacedFrom.length > 0 && (
                    <div className="small text-muted d-flex flex-wrap align-items-center gap-1">
                        <span>Правонаступник для:</span>
                        {s.replacedFrom.map((prev, idx) => (
                            <span key={prev.id}>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 align-baseline text-decoration-none font-monospace"
                                    onClick={() => handleJumpToCode(prev.code)}
                                    title={`${prev.code} — ${prev.name}`}
                                >
                                    {prev.code}
                                </Button>
                                {idx < s.replacedFrom.length - 1 ? ', ' : ''}
                            </span>
                        ))}
                    </div>
                )}

                {!s.isActive && (deactivatedDate || s.deactivationReason) && (
                    <div className="small text-muted">
                        {deactivatedDate && <span>Деактивовано {deactivatedDate}</span>}
                        {deactivatedDate && s.deactivationReason && <span> · </span>}
                        {s.deactivationReason && <span>{s.deactivationReason}</span>}
                    </div>
                )}
            </div>
        );
    };

    const renderActions = (s: SpecialtyItem) => {
        if (!actor?.isSuperAdmin) return null;
        const isActivating = activatingId === s.id;

        return (
            <div className="d-flex flex-wrap gap-1 justify-content-lg-end">
                <Button
                    size="sm"
                    variant="outline-secondary"
                    title="Редагувати код або назву"
                    onClick={() => setFormModal({ mode: 'edit', specialty: s })}
                >
                    <i className="bi bi-pencil" />
                    <span className="d-lg-none ms-1">Редагувати</span>
                </Button>

                {s.replacedById === null && (
                    <Button
                        size="sm"
                        variant="outline-primary"
                        title="Замінити / перекодувати правонаступником"
                        onClick={() => setReplacingSpecialty(s)}
                    >
                        <i className="bi bi-arrow-left-right" />
                        <span className="d-lg-none ms-1">Замінити</span>
                    </Button>
                )}

                {s.isActive ? (
                    <Button
                        size="sm"
                        variant="outline-warning"
                        title="Деактивувати без правонаступника"
                        onClick={() => setConfirmModal({ action: 'deactivate', specialty: s })}
                    >
                        <i className="bi bi-pause-circle" />
                        <span className="d-lg-none ms-1">Деактивувати</span>
                    </Button>
                ) : (
                    s.replacedById === null && (
                        <Button
                            size="sm"
                            variant="outline-success"
                            title="Повторно активувати"
                            disabled={isActivating}
                            onClick={() => handleActivate(s)}
                        >
                            {isActivating ? (
                                <Spinner size="sm" aria-hidden="true" />
                            ) : (
                                <i className="bi bi-play-circle" />
                            )}
                            <span className="d-lg-none ms-1">Активувати</span>
                        </Button>
                    )
                )}

                {s.canDelete && (
                    <Button
                        size="sm"
                        variant="outline-danger"
                        title="Видалити порожню спеціальність"
                        onClick={() => setConfirmModal({ action: 'delete', specialty: s })}
                    >
                        <i className="bi bi-trash" />
                        <span className="d-lg-none ms-1">Видалити</span>
                    </Button>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <Container className="py-5 text-center">
                <Spinner />
            </Container>
        );
    }

    if (isError || !data || !actor) {
        return (
            <Container className="py-4">
                <Alert variant="danger" className="d-flex justify-content-between align-items-center">
                    <span>
                        {error instanceof Error
                            ? error.message
                            : 'Не вдалося завантажити довідник спеціальностей'}
                    </span>
                    <Button size="sm" variant="outline-danger" onClick={() => refetch()}>
                        Спробувати ще раз
                    </Button>
                </Alert>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div>
                    <h1 className="h4 mb-1">Довідник спеціальностей</h1>
                    <div className="text-muted small">
                        {actor.isSuperAdmin ? (
                            <span>
                                Режим: <Badge bg="primary">Головний адміністратор</Badge> — повне
                                керування довідником та перекодуванням спеціальностей
                            </span>
                        ) : (
                            <span>
                                Режим: <Badge bg="secondary">Адміністратор підрозділу</Badge> —
                                лише перегляд довідника
                            </span>
                        )}
                    </div>
                </div>

                {actor.isSuperAdmin && (
                    <Button variant="primary" onClick={() => setFormModal({ mode: 'create' })}>
                        <i className="bi bi-plus-lg me-1" />
                        Додати спеціальність
                    </Button>
                )}
            </div>

            {successMessage && (
                <Alert
                    variant="success"
                    dismissible
                    onClose={() => setSuccessMessage(null)}
                    className="py-2 small"
                >
                    {successMessage}
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

            <Card className="shadow-sm border-0">
                <Card.Body className="border-bottom">
                    <Row className="g-2 align-items-center">
                        <Col xs={12} lg={5}>
                            <ButtonGroup size="sm" className="w-100 flex-wrap">
                                <Button
                                    variant={statusFilter === 'active' ? 'primary' : 'outline-secondary'}
                                    onClick={() => setStatusFilter('active')}
                                >
                                    Активні ({counts.active})
                                </Button>
                                <Button
                                    variant={statusFilter === 'all' ? 'primary' : 'outline-secondary'}
                                    onClick={() => setStatusFilter('all')}
                                >
                                    Усі ({counts.total})
                                </Button>
                                <Button
                                    variant={
                                        statusFilter === 'inactive' ? 'primary' : 'outline-secondary'
                                    }
                                    onClick={() => setStatusFilter('inactive')}
                                >
                                    Неактивні ({counts.inactive})
                                </Button>
                                <Button
                                    variant={
                                        statusFilter === 'replaced' ? 'primary' : 'outline-secondary'
                                    }
                                    onClick={() => setStatusFilter('replaced')}
                                >
                                    Замінені ({counts.replaced})
                                </Button>
                            </ButtonGroup>
                        </Col>

                        <Col xs={12} md={6} lg={3}>
                            <Form.Select
                                size="sm"
                                aria-label="Фільтр за галуззю знань"
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                            >
                                <option value="ALL">Усі галузі знань</option>
                                {availableBranches.map((branchKey) => (
                                    <option key={branchKey} value={branchKey}>
                                        {getBranchLabel(branchKey)}
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>

                        <Col xs={12} md={6} lg={4}>
                            <InputGroup size="sm">
                                <InputGroup.Text>
                                    <i className="bi bi-search" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="search"
                                    placeholder="Пошук за кодом або назвою…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => setSearchQuery('')}
                                        aria-label="Очистити пошук"
                                    >
                                        <i className="bi bi-x-lg" />
                                    </Button>
                                )}
                            </InputGroup>
                        </Col>
                    </Row>
                </Card.Body>

                {filteredSpecialties.length === 0 ? (
                    <Card.Body className="text-center text-muted py-5">
                        <i className="bi bi-journal-bookmark fs-1 d-block mb-2 opacity-50" />
                        {specialties.length === 0 ? (
                            <div>
                                Довідник спеціальностей поки порожній.
                                {actor.isSuperAdmin &&
                                    ' Додайте першу спеціальність або запустіть сід класифікатора МОН.'}
                            </div>
                        ) : (
                            <div>За обраними фільтрами спеціальностей не знайдено.</div>
                        )}
                    </Card.Body>
                ) : (
                    <>
                        {/* Десктопна таблиця */}
                        <div className="d-none d-lg-block table-responsive">
                            <Table hover className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '110px' }}>Код</th>
                                        <th>Назва та історія змін</th>
                                        <th style={{ width: '120px' }}>Статус</th>
                                        <th style={{ width: '110px' }} className="text-center">
                                            ОП
                                        </th>
                                        {actor.isSuperAdmin && (
                                            <th style={{ width: '190px' }} className="text-end">
                                                Дії
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSpecialties.map((s) => (
                                        <tr
                                            key={s.id}
                                            className={s.isActive ? undefined : 'table-light'}
                                        >
                                            <td>{renderCodeBadge(s.code, s.isActive)}</td>
                                            <td>
                                                <div
                                                    className={
                                                        s.isActive
                                                            ? 'fw-medium specialty-name'
                                                            : 'text-muted specialty-name'
                                                    }
                                                >
                                                    {s.name}
                                                </div>
                                                {renderSuccessionMeta(s)}
                                            </td>
                                            <td>{renderStatusBadge(s)}</td>
                                            <td className="text-center">
                                                {renderProgramsCountLink(s, false)}
                                            </td>
                                            {actor.isSuperAdmin && (
                                                <td className="text-end">{renderActions(s)}</td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        {/* Мобільний / планшетний список карток */}
                        <div className="d-lg-none">
                            {filteredSpecialties.map((s) => (
                                <div
                                    key={s.id}
                                    className={`p-3 border-bottom ${s.isActive ? '' : 'bg-light'}`}
                                >
                                    <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            {renderCodeBadge(s.code, s.isActive)}
                                            {renderStatusBadge(s)}
                                        </div>
                                        {renderProgramsCountLink(s, true)}
                                    </div>

                                    <div
                                        className={`specialty-name ${
                                            s.isActive ? 'fw-medium' : 'text-muted'
                                        }`}
                                    >
                                        {s.name}
                                    </div>

                                    {renderSuccessionMeta(s)}

                                    {actor.isSuperAdmin && (
                                        <div className="mt-2 pt-2 border-top">
                                            {renderActions(s)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <Card.Footer className="bg-white text-muted small d-flex justify-content-between flex-wrap gap-2">
                    <span>
                        Показано: <strong>{filteredSpecialties.length}</strong> з{' '}
                        <strong>{specialties.length}</strong>
                    </span>
                    <span>
                        {actor.isSuperAdmin
                            ? 'ОП — кількість активних освітніх програм спеціальності'
                            : 'ОП — кількість активних освітніх програм у межах вашого підрозділу'}
                    </span>
                </Card.Footer>
            </Card>

            {formModal && (
                <SpecialtyFormModal
                    key={formModal.mode === 'edit' ? `edit-${formModal.specialty.id}` : 'create'}
                    show
                    mode={formModal.mode}
                    editingSpecialty={formModal.mode === 'edit' ? formModal.specialty : null}
                    onHide={() => setFormModal(null)}
                    onSaved={handleActionSuccess}
                />
            )}

            {replacingSpecialty && (
                <ReplaceSpecialtyModal
                    key={`replace-${replacingSpecialty.id}`}
                    show
                    sourceSpecialty={replacingSpecialty}
                    allSpecialties={specialties}
                    onHide={() => setReplacingSpecialty(null)}
                    onReplaced={handleActionSuccess}
                />
            )}

            {confirmModal && (
                <ConfirmSpecialtyActionModal
                    key={`${confirmModal.action}-${confirmModal.specialty.id}`}
                    show
                    action={confirmModal.action}
                    specialty={confirmModal.specialty}
                    onHide={() => setConfirmModal(null)}
                    onCompleted={handleActionSuccess}
                />
            )}
        </Container>
    );
}
