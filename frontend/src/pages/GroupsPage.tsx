import { useCallback, useMemo, useState, type CSSProperties } from 'react';
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
    DEGREE_LEVELS,
    DEGREE_LEVEL_LABELS,
    DEGREE_LEVEL_SHORT_LABELS,
    EDUCATIONAL_PROGRAMS_KEY,
    type DegreeLevel,
    type ProgramDepartmentRef,
} from '../api/educationalPrograms';
import {
    GROUPS_KEY,
    activateGroup,
    fetchGroups,
    type GroupItem,
    type GroupProgramRef,
} from '../api/groups';
import { ORG_TREE_KEY, fetchOrgUnitsTree, type OrgUnitTreeItem } from '../api/orgUnits';
import ConfirmGroupActionModal from '../components/groups/ConfirmGroupActionModal';
import GroupFormModal from '../components/groups/GroupFormModal';
import { getSpecialtyCodeStyle } from '../components/specialties/branchColors';

type StatusFilter = 'active' | 'all' | 'inactive';

type FormModalState =
    | { mode: 'create' }
    | { mode: 'edit'; group: GroupItem }
    | null;

type ConfirmModalState = {
    action: 'deactivate' | 'delete';
    group: GroupItem;
} | null;

const VALID_STATUS_FILTERS: readonly StatusFilter[] = ['active', 'all', 'inactive'];

const DEGREE_BADGE_STYLES: Record<DegreeLevel, CSSProperties> = {
    bachelor: {
        backgroundColor: 'hsl(215, 70%, 90%)',
        color: 'hsl(215, 65%, 24%)',
        border: '1px solid hsl(215, 55%, 74%)',
    },
    master: {
        backgroundColor: 'hsl(268, 60%, 90%)',
        color: 'hsl(268, 55%, 26%)',
        border: '1px solid hsl(268, 48%, 74%)',
    },
    phd: {
        backgroundColor: 'hsl(168, 52%, 88%)',
        color: 'hsl(168, 58%, 22%)',
        border: '1px solid hsl(168, 44%, 70%)',
    },
};

function parsePositiveInt(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseStatusFilter(value: string | null): StatusFilter {
    if (value && (VALID_STATUS_FILTERS as readonly string[]).includes(value)) {
        return value as StatusFilter;
    }
    return 'active';
}

function parseDegreeFilter(value: string | null): 'ALL' | DegreeLevel {
    if (value && (DEGREE_LEVELS as readonly string[]).includes(value)) {
        return value as DegreeLevel;
    }
    return 'ALL';
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

export default function GroupsPage() {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const statusFilter = parseStatusFilter(searchParams.get('status'));
    const degreeFilter = parseDegreeFilter(searchParams.get('degree'));
    const unitFilterId = parsePositiveInt(searchParams.get('unitId'));
    const departmentFilterId = parsePositiveInt(searchParams.get('departmentId'));
    const programFilterId = parsePositiveInt(searchParams.get('programId'));
    const yearFilterValue = parsePositiveInt(searchParams.get('year'));
    const searchQuery = searchParams.get('q') ?? '';

    const departmentFilter = departmentFilterId !== null ? String(departmentFilterId) : 'ALL';
    const programFilter = programFilterId !== null ? String(programFilterId) : 'ALL';
    const yearFilter = yearFilterValue !== null ? String(yearFilterValue) : 'ALL';

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [activatingId, setActivatingId] = useState<number | null>(null);

    const [formModal, setFormModal] = useState<FormModalState>(null);
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

    const setDegreeFilter = (nextDegree: 'ALL' | DegreeLevel) => {
        updateSearchParams((next) => {
            if (nextDegree === 'ALL') next.delete('degree');
            else next.set('degree', nextDegree);
        });
    };

    const setDepartmentFilter = (nextDepartment: string) => {
        updateSearchParams((next) => {
            if (nextDepartment === 'ALL') {
                next.delete('departmentId');
            } else {
                next.set('departmentId', nextDepartment);
            }
        });
    };

    const setProgramFilter = (nextProgram: string) => {
        updateSearchParams((next) => {
            if (nextProgram === 'ALL') next.delete('programId');
            else next.set('programId', nextProgram);
        });
    };

    const setYearFilter = (nextYear: string) => {
        updateSearchParams((next) => {
            if (nextYear === 'ALL') next.delete('year');
            else next.set('year', nextYear);
        });
    };

    const setSearchQuery = (nextQuery: string) => {
        updateSearchParams((next) => {
            if (!nextQuery) next.delete('q');
            else next.set('q', nextQuery);
        });
    };

    const clearUnitFilter = () => {
        updateSearchParams((next) => {
            next.delete('unitId');
        });
    };

    const resetAllFilters = () => {
        setSearchParams(new URLSearchParams(), { replace: true });
    };

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: [...GROUPS_KEY, true],
        queryFn: () => fetchGroups(true),
    });

    const { data: orgTreeData } = useQuery({
        queryKey: [...ORG_TREE_KEY, true],
        queryFn: () => fetchOrgUnitsTree(true),
        enabled: unitFilterId !== null,
    });

    const groups = useMemo(() => data?.groups ?? [], [data]);
    const availablePrograms = useMemo(() => data?.availablePrograms ?? [], [data]);
    const availableDepartments = useMemo(() => data?.availableDepartments ?? [], [data]);
    const actor = data?.actor;

    const { scopedUnit, unitSubtreeDepartmentIds } = useMemo(() => {
        if (unitFilterId === null || !orgTreeData?.units) {
            return {
                scopedUnit: null as OrgUnitTreeItem | null,
                unitSubtreeDepartmentIds: null as Set<number> | null,
            };
        }
        const byId = new Map<number, OrgUnitTreeItem>();
        const childrenByParent = new Map<number, OrgUnitTreeItem[]>();
        for (const u of orgTreeData.units) {
            byId.set(u.id, u);
            if (u.parentId !== null) {
                const list = childrenByParent.get(u.parentId) ?? [];
                list.push(u);
                childrenByParent.set(u.parentId, list);
            }
        }
        const target = byId.get(unitFilterId) ?? null;
        if (!target) {
            return { scopedUnit: null, unitSubtreeDepartmentIds: null };
        }

        const deptIds = new Set<number>();
        const queue: OrgUnitTreeItem[] = [target];
        const visited = new Set<number>([target.id]);
        while (queue.length > 0) {
            const cur = queue.shift()!;
            if (cur.unitType === 'department') {
                deptIds.add(cur.id);
            }
            for (const child of childrenByParent.get(cur.id) ?? []) {
                if (!visited.has(child.id)) {
                    visited.add(child.id);
                    queue.push(child);
                }
            }
        }
        return { scopedUnit: target, unitSubtreeDepartmentIds: deptIds };
    }, [unitFilterId, orgTreeData]);

    const departmentOptions = useMemo(() => {
        const map = new Map<number, ProgramDepartmentRef>();
        for (const g of groups) {
            if (!unitSubtreeDepartmentIds || unitSubtreeDepartmentIds.has(g.program.department.id)) {
                map.set(g.program.department.id, g.program.department);
            }
        }
        if (departmentFilterId !== null && !map.has(departmentFilterId)) {
            const found = availableDepartments.find((d) => d.id === departmentFilterId);
            if (found) map.set(found.id, found);
        }
        return [...map.values()].sort((a, b) => {
            const pCmp = (a.parentShortName ?? a.parentName ?? '').localeCompare(
                b.parentShortName ?? b.parentName ?? '',
                'uk',
            );
            if (pCmp !== 0) return pCmp;
            return a.name.localeCompare(b.name, 'uk');
        });
    }, [groups, availableDepartments, departmentFilterId, unitSubtreeDepartmentIds]);

    const programOptions = useMemo(() => {
        const map = new Map<number, GroupProgramRef>();
        for (const g of groups) {
            if (unitSubtreeDepartmentIds && !unitSubtreeDepartmentIds.has(g.program.department.id)) {
                continue;
            }
            if (departmentFilterId !== null && g.program.department.id !== departmentFilterId) {
                continue;
            }
            map.set(g.program.id, g.program);
        }
        if (programFilterId !== null && !map.has(programFilterId)) {
            const found = availablePrograms.find((p) => p.id === programFilterId);
            if (found) map.set(found.id, found);
        }
        return [...map.values()].sort((a, b) => {
            const specCmp = a.specialty.code.localeCompare(b.specialty.code, 'uk', {
                numeric: true,
                sensitivity: 'base',
            });
            if (specCmp !== 0) return specCmp;
            return a.name.localeCompare(b.name, 'uk');
        });
    }, [
        groups,
        availablePrograms,
        programFilterId,
        departmentFilterId,
        unitSubtreeDepartmentIds,
    ]);

    const yearOptions = useMemo(() => {
        const set = new Set<number>();
        for (const g of groups) {
            if (g.enrollmentYear !== null) set.add(g.enrollmentYear);
        }
        if (yearFilterValue !== null) set.add(yearFilterValue);
        return [...set].sort((a, b) => b - a);
    }, [groups, yearFilterValue]);

    const selectedDepartmentObj = useMemo(
        () =>
            departmentFilterId !== null
                ? (availableDepartments.find((d) => d.id === departmentFilterId) ??
                  groups.find((g) => g.program.department.id === departmentFilterId)?.program
                      .department ??
                  null)
                : null,
        [departmentFilterId, availableDepartments, groups],
    );

    const selectedProgramObj = useMemo(
        () =>
            programFilterId !== null
                ? (availablePrograms.find((p) => p.id === programFilterId) ??
                  groups.find((g) => g.educationalProgramId === programFilterId)?.program ??
                  null)
                : null,
        [programFilterId, availablePrograms, groups],
    );

    const contextGroups = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return groups.filter((g) => {
            if (
                unitSubtreeDepartmentIds &&
                !unitSubtreeDepartmentIds.has(g.program.department.id)
            ) {
                return false;
            }
            if (departmentFilterId !== null && g.program.department.id !== departmentFilterId) {
                return false;
            }
            if (programFilterId !== null && g.educationalProgramId !== programFilterId) {
                return false;
            }
            if (degreeFilter !== 'ALL' && g.program.degreeLevel !== degreeFilter) {
                return false;
            }
            if (yearFilterValue !== null && g.enrollmentYear !== yearFilterValue) {
                return false;
            }

            if (q) {
                const haystack = [
                    g.name,
                    g.enrollmentYear !== null ? String(g.enrollmentYear) : '',
                    g.program.name,
                    g.program.specialty.code,
                    g.program.specialty.name,
                    g.program.department.name,
                    g.program.department.shortName ?? '',
                    g.program.department.parentName ?? '',
                    g.program.department.parentShortName ?? '',
                ]
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(q)) return false;
            }

            return true;
        });
    }, [
        groups,
        unitSubtreeDepartmentIds,
        departmentFilterId,
        programFilterId,
        degreeFilter,
        yearFilterValue,
        searchQuery,
    ]);

    const counts = useMemo(() => {
        let active = 0;
        let inactive = 0;
        for (const g of contextGroups) {
            if (g.isActive) active += 1;
            else inactive += 1;
        }
        return { total: contextGroups.length, active, inactive };
    }, [contextGroups]);

    const filteredGroups = useMemo(() => {
        return contextGroups.filter((g) => {
            if (statusFilter === 'active' && !g.isActive) return false;
            if (statusFilter === 'inactive' && g.isActive) return false;
            return true;
        });
    }, [contextGroups, statusFilter]);

    const hasActivePrograms = useMemo(
        () => availablePrograms.some((p) => p.isActive && p.department.isActive),
        [availablePrograms],
    );

    const hasActiveContextFilters =
        unitFilterId !== null ||
        departmentFilterId !== null ||
        programFilterId !== null ||
        degreeFilter !== 'ALL' ||
        yearFilterValue !== null ||
        searchQuery.trim().length > 0;

    const invalidateRelatedQueries = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: GROUPS_KEY }),
            queryClient.invalidateQueries({ queryKey: EDUCATIONAL_PROGRAMS_KEY }),
        ]);
    };

    const handleActionSuccess = async (message: string) => {
        setActionError(null);
        await invalidateRelatedQueries();
        setSuccessMessage(message);
    };

    const handleActivate = async (group: GroupItem) => {
        setActionError(null);
        setActivatingId(group.id);
        try {
            await activateGroup(group.id);
            await handleActionSuccess(`Групу «${group.name}» відновлено з архіву.`);
        } catch (err) {
            setActionError(
                err instanceof Error ? err.message : 'Не вдалося активувати академічну групу',
            );
        } finally {
            setActivatingId(null);
        }
    };

    const renderDegreeBadge = (level: DegreeLevel) => (
        <span className="badge fw-semibold" style={DEGREE_BADGE_STYLES[level]}>
            {DEGREE_LEVEL_SHORT_LABELS[level]}
        </span>
    );

    const renderSpecialtyBadgeLink = (g: GroupItem) => (
        <Link
            to={`/admin/specialties?q=${encodeURIComponent(g.program.specialty.code)}&status=all`}
            className="badge font-monospace specialty-code-badge specialty-code-badge-link"
            style={getSpecialtyCodeStyle(
                g.program.specialty.code,
                g.program.specialty.isActive && g.isActive,
            )}
            title={`Перейти до спеціальності ${g.program.specialty.code} — ${g.program.specialty.name}`}
        >
            {g.program.specialty.code}
        </Link>
    );

    const renderStatusBadge = (g: GroupItem) =>
        g.isActive ? (
            <Badge bg="success">Активна</Badge>
        ) : (
            <Badge bg="secondary">Архівна</Badge>
        );

    const renderActions = (g: GroupItem) => {
        const isActivating = activatingId === g.id;

        return (
            <div className="d-flex flex-wrap gap-1 justify-content-lg-end">
                <Button
                    size="sm"
                    variant="outline-secondary"
                    title="Редагувати групу"
                    onClick={() => setFormModal({ mode: 'edit', group: g })}
                >
                    <i className="bi bi-pencil" />
                    <span className="d-lg-none ms-1">Редагувати</span>
                </Button>

                {g.isActive ? (
                    <Button
                        size="sm"
                        variant="outline-warning"
                        title="Перевести групу в архів (випуск)"
                        onClick={() => setConfirmModal({ action: 'deactivate', group: g })}
                    >
                        <i className="bi bi-archive" />
                        <span className="d-lg-none ms-1">В архів</span>
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="outline-success"
                        title="Відновити з архіву"
                        disabled={isActivating}
                        onClick={() => handleActivate(g)}
                    >
                        {isActivating ? (
                            <Spinner size="sm" aria-hidden="true" />
                        ) : (
                            <i className="bi bi-arrow-counterclockwise" />
                        )}
                        <span className="d-lg-none ms-1">Активувати</span>
                    </Button>
                )}

                {g.canDelete && (
                    <Button
                        size="sm"
                        variant="outline-danger"
                        title="Видалити порожню групу"
                        onClick={() => setConfirmModal({ action: 'delete', group: g })}
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
                            : 'Не вдалося завантажити академічні групи'}
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
                    <h1 className="h4 mb-1">Академічні групи</h1>
                    <div className="text-muted small">
                        {actor.isSuperAdmin ? (
                            <span>
                                Режим: <Badge bg="primary">Головний адміністратор</Badge> —
                                керування академічними групами всіх освітніх програм університету
                            </span>
                        ) : (
                            <span>
                                Режим: <Badge bg="secondary">Адміністратор підрозділу</Badge> —
                                керування групами кафедр у межах вашого підрозділу
                            </span>
                        )}
                    </div>
                </div>

                <Button
                    variant="primary"
                    disabled={!hasActivePrograms}
                    onClick={() => setFormModal({ mode: 'create' })}
                    title={
                        !hasActivePrograms
                            ? 'У вашій зоні відповідальності немає активних освітніх програм'
                            : undefined
                    }
                >
                    <i className="bi bi-plus-lg me-1" />
                    Додати групу
                </Button>
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

            {(scopedUnit || selectedDepartmentObj || selectedProgramObj) && (
                <Alert
                    variant="light"
                    className="border py-2 px-3 mb-3 small d-flex flex-wrap justify-content-between align-items-center gap-2"
                >
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="text-muted">Контекст фільтра:</span>

                        {scopedUnit && (
                            <span className="d-inline-flex align-items-center gap-1 bg-white border rounded px-2 py-1">
                                <i className="bi bi-diagram-3 text-primary" />
                                <Link
                                    to={`/admin/org-structure?unitId=${scopedUnit.id}${
                                        !scopedUnit.isActive ? '&includeInactive=1' : ''
                                    }`}
                                    className="entity-link fw-medium"
                                    title="Повернутися до підрозділу в оргструктурі"
                                >
                                    {scopedUnit.shortName
                                        ? `${scopedUnit.shortName} — ${scopedUnit.name}`
                                        : scopedUnit.name}
                                </Link>
                                <button
                                    type="button"
                                    className="btn-close ms-1"
                                    style={{ fontSize: '0.6rem' }}
                                    aria-label="Скинути фільтр підрозділу"
                                    onClick={clearUnitFilter}
                                />
                            </span>
                        )}

                        {selectedDepartmentObj && (
                            <span className="d-inline-flex align-items-center gap-1 bg-white border rounded px-2 py-1">
                                <i className="bi bi-building text-primary" />
                                <Link
                                    to={`/admin/org-structure?unitId=${selectedDepartmentObj.id}${
                                        !selectedDepartmentObj.isActive ? '&includeInactive=1' : ''
                                    }`}
                                    className="entity-link fw-medium"
                                    title="Відкрити кафедру в організаційній структурі"
                                >
                                    {selectedDepartmentObj.shortName
                                        ? `${selectedDepartmentObj.shortName} — ${selectedDepartmentObj.name}`
                                        : selectedDepartmentObj.name}
                                </Link>
                                <button
                                    type="button"
                                    className="btn-close ms-1"
                                    style={{ fontSize: '0.6rem' }}
                                    aria-label="Скинути фільтр кафедри"
                                    onClick={() => setDepartmentFilter('ALL')}
                                />
                            </span>
                        )}

                        {selectedProgramObj && (
                            <span className="d-inline-flex align-items-center gap-1 bg-white border rounded px-2 py-1">
                                <i className="bi bi-mortarboard text-primary" />
                                <Link
                                    to={`/admin/educational-programs?departmentId=${selectedProgramObj.department.id}&q=${encodeURIComponent(
                                        selectedProgramObj.name,
                                    )}${!selectedProgramObj.isActive ? '&status=all' : ''}`}
                                    className="entity-link fw-medium"
                                    title="Відкрити освітню програму"
                                >
                                    [{selectedProgramObj.specialty.code} ·{' '}
                                    {DEGREE_LEVEL_SHORT_LABELS[selectedProgramObj.degreeLevel]}]{' '}
                                    {selectedProgramObj.name}
                                </Link>
                                <button
                                    type="button"
                                    className="btn-close ms-1"
                                    style={{ fontSize: '0.6rem' }}
                                    aria-label="Скинути фільтр освітньої програми"
                                    onClick={() => setProgramFilter('ALL')}
                                />
                            </span>
                        )}
                    </div>

                    <Button
                        size="sm"
                        variant="outline-secondary"
                        className="py-0 px-2"
                        onClick={resetAllFilters}
                    >
                        Скинути все
                    </Button>
                </Alert>
            )}

            <Card className="shadow-sm border-0">
                <Card.Body className="border-bottom">
                    <Row className="g-2 align-items-center">
                        <Col xs={12} lg={4}>
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
                                    Архівні ({counts.inactive})
                                </Button>
                            </ButtonGroup>
                        </Col>

                        <Col xs={6} md={3} lg={2}>
                            <Form.Select
                                size="sm"
                                aria-label="Фільтр за рівнем освіти"
                                value={degreeFilter}
                                onChange={(e) =>
                                    setDegreeFilter(e.target.value as 'ALL' | DegreeLevel)
                                }
                            >
                                <option value="ALL">Усі рівні</option>
                                {DEGREE_LEVELS.map((level) => (
                                    <option key={level} value={level}>
                                        {DEGREE_LEVEL_LABELS[level]}
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>

                        <Col xs={6} md={3} lg={2}>
                            <Form.Select
                                size="sm"
                                aria-label="Фільтр за роком вступу"
                                value={yearFilter}
                                onChange={(e) => setYearFilter(e.target.value)}
                            >
                                <option value="ALL">Усі роки</option>
                                {yearOptions.map((y) => (
                                    <option key={y} value={String(y)}>
                                        {y} р. вступу
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
                                    placeholder="Пошук за шифром, ОП, кафедрою…"
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

                        {(departmentOptions.length > 1 || departmentFilterId !== null) && (
                            <Col xs={12} md={6}>
                                <Form.Select
                                    size="sm"
                                    aria-label="Фільтр за кафедрою"
                                    value={departmentFilter}
                                    onChange={(e) => setDepartmentFilter(e.target.value)}
                                >
                                    <option value="ALL">
                                        Усі кафедри ({departmentOptions.length})
                                    </option>
                                    {departmentOptions.map((dept) => (
                                        <option key={dept.id} value={String(dept.id)}>
                                            {dept.parentShortName
                                                ? `[${dept.parentShortName}] `
                                                : ''}
                                            {dept.shortName ? `${dept.shortName} — ` : ''}
                                            {dept.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Col>
                        )}

                        {(programOptions.length > 1 || programFilterId !== null) && (
                            <Col xs={12} md={6}>
                                <Form.Select
                                    size="sm"
                                    aria-label="Фільтр за освітньою програмою"
                                    value={programFilter}
                                    onChange={(e) => setProgramFilter(e.target.value)}
                                >
                                    <option value="ALL">
                                        Усі освітні програми ({programOptions.length})
                                    </option>
                                    {programOptions.map((prog) => (
                                        <option key={prog.id} value={String(prog.id)}>
                                            [{prog.specialty.code} ·{' '}
                                            {DEGREE_LEVEL_SHORT_LABELS[prog.degreeLevel]}]{' '}
                                            {prog.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Col>
                        )}
                    </Row>
                </Card.Body>

                {filteredGroups.length === 0 ? (
                    <Card.Body className="text-center text-muted py-5">
                        <i className="bi bi-people fs-1 d-block mb-2 opacity-50" />
                        {groups.length === 0 ? (
                            <div>
                                У вашій зоні відповідальності поки немає академічних груп.
                                Натисніть <strong>«Додати групу»</strong>, щоб створити першу.
                            </div>
                        ) : (
                            <div className="d-flex flex-column align-items-center gap-2">
                                <span>
                                    {statusFilter === 'active' && counts.inactive > 0
                                        ? 'Активних груп за обраними фільтрами немає.'
                                        : 'За обраними фільтрами академічних груп не знайдено.'}
                                </span>
                                <div className="d-flex flex-wrap gap-2 justify-content-center">
                                    {statusFilter === 'active' && counts.inactive > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            onClick={() => setStatusFilter('all')}
                                        >
                                            Показати архівні ({counts.inactive})
                                        </Button>
                                    )}
                                    {hasActiveContextFilters && (
                                        <Button
                                            size="sm"
                                            variant="outline-secondary"
                                            onClick={resetAllFilters}
                                        >
                                            Скинути фільтри
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card.Body>
                ) : (
                    <>
                        {/* Десктопна таблиця */}
                        <div className="d-none d-lg-block table-responsive">
                            <Table hover className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '135px' }}>Група</th>
                                        <th>Освітня програма</th>
                                        <th style={{ width: '115px' }}>Рівень</th>
                                        <th style={{ width: '210px' }}>Кафедра</th>
                                        <th style={{ width: '115px' }}>Статус</th>
                                        <th style={{ width: '95px' }} className="text-center">
                                            Студенти
                                        </th>
                                        <th style={{ width: '150px' }} className="text-end">
                                            Дії
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGroups.map((g) => {
                                        const deactivatedDate = formatDateUk(g.deactivatedAt);
                                        return (
                                            <tr
                                                key={g.id}
                                                className={g.isActive ? undefined : 'table-light'}
                                            >
                                                <td>
                                                    <div
                                                        className={`fw-semibold font-monospace ${
                                                            g.isActive ? 'text-dark' : 'text-muted'
                                                        }`}
                                                    >
                                                        {g.name}
                                                    </div>
                                                    {g.enrollmentYear !== null && (
                                                        <div className="small text-muted">
                                                            {g.enrollmentYear} р. вступу
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-start gap-2">
                                                        <div className="flex-shrink-0 pt-1">
                                                            {renderSpecialtyBadgeLink(g)}
                                                        </div>
                                                        <div>
                                                            <div className="specialty-name">
                                                                <Link
                                                                    to={`/admin/educational-programs?departmentId=${g.program.department.id}&q=${encodeURIComponent(
                                                                        g.program.name,
                                                                    )}${
                                                                        !g.program.isActive
                                                                            ? '&status=all'
                                                                            : ''
                                                                    }`}
                                                                    className={`entity-link ${
                                                                        g.isActive
                                                                            ? 'fw-medium'
                                                                            : 'text-muted'
                                                                    }`}
                                                                    title="Відкрити освітню програму"
                                                                >
                                                                    {g.program.name}
                                                                </Link>
                                                            </div>
                                                            <div className="small text-muted">
                                                                {g.program.specialty.name}
                                                                {!g.program.isActive && (
                                                                    <span className="ms-1 text-warning-emphasis">
                                                                        (ОП неактивна)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {!g.isActive && deactivatedDate && (
                                                                <div className="small text-muted">
                                                                    В архіві з {deactivatedDate}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{renderDegreeBadge(g.program.degreeLevel)}</td>
                                                <td>
                                                    <div className="small fw-medium specialty-name">
                                                        <Link
                                                            to={`/admin/org-structure?unitId=${g.program.department.id}${
                                                                !g.program.department.isActive
                                                                    ? '&includeInactive=1'
                                                                    : ''
                                                            }`}
                                                            className="entity-link"
                                                            title="Відкрити кафедру в організаційній структурі"
                                                        >
                                                            {g.program.department.shortName ??
                                                                g.program.department.name}
                                                        </Link>
                                                    </div>
                                                    <div className="small text-muted specialty-name">
                                                        {g.program.department.parentShortName
                                                            ? `${g.program.department.parentShortName} · `
                                                            : ''}
                                                        {g.program.department.shortName
                                                            ? g.program.department.name
                                                            : (g.program.department.parentName ??
                                                              '')}
                                                    </div>
                                                </td>
                                                <td>{renderStatusBadge(g)}</td>
                                                <td className="text-center">
                                                    <span
                                                        className={
                                                            g.counts.activeStudents > 0
                                                                ? 'small fw-semibold'
                                                                : 'small text-muted'
                                                        }
                                                        title={`Активних студентів: ${g.counts.activeStudents}`}
                                                    >
                                                        {g.counts.activeStudents}
                                                    </span>
                                                </td>
                                                <td className="text-end">{renderActions(g)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>

                        {/* Мобільний / планшетний список карток */}
                        <div className="d-lg-none">
                            {filteredGroups.map((g) => {
                                const deactivatedDate = formatDateUk(g.deactivatedAt);
                                return (
                                    <div
                                        key={g.id}
                                        className={`p-3 border-bottom ${g.isActive ? '' : 'bg-light'}`}
                                    >
                                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span
                                                    className={`fw-semibold font-monospace fs-6 ${
                                                        g.isActive ? 'text-dark' : 'text-muted'
                                                    }`}
                                                >
                                                    {g.name}
                                                </span>
                                                {renderDegreeBadge(g.program.degreeLevel)}
                                                {renderStatusBadge(g)}
                                            </div>
                                            <span className="small text-muted text-nowrap">
                                                Студентів: {g.counts.activeStudents}
                                            </span>
                                        </div>

                                        {g.enrollmentYear !== null && (
                                            <div className="small text-muted mb-1">
                                                {g.enrollmentYear} р. вступу
                                                {!g.isActive && deactivatedDate
                                                    ? ` · В архіві з ${deactivatedDate}`
                                                    : ''}
                                            </div>
                                        )}

                                        <div className="d-flex align-items-start gap-2 mt-1">
                                            <div className="flex-shrink-0">
                                                {renderSpecialtyBadgeLink(g)}
                                            </div>
                                            <div className="specialty-name small">
                                                <Link
                                                    to={`/admin/educational-programs?departmentId=${g.program.department.id}&q=${encodeURIComponent(
                                                        g.program.name,
                                                    )}${!g.program.isActive ? '&status=all' : ''}`}
                                                    className="entity-link fw-medium"
                                                >
                                                    {g.program.name}
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="small text-muted mt-1">
                                            <i className="bi bi-building me-1" />
                                            {g.program.department.parentShortName
                                                ? `${g.program.department.parentShortName} → `
                                                : ''}
                                            <Link
                                                to={`/admin/org-structure?unitId=${g.program.department.id}${
                                                    !g.program.department.isActive
                                                        ? '&includeInactive=1'
                                                        : ''
                                                }`}
                                                className="entity-link"
                                            >
                                                {g.program.department.shortName
                                                    ? `${g.program.department.shortName} (${g.program.department.name})`
                                                    : g.program.department.name}
                                            </Link>
                                        </div>

                                        <div className="mt-2 pt-2 border-top">
                                            {renderActions(g)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                <Card.Footer className="bg-white text-muted small d-flex justify-content-between flex-wrap gap-2">
                    <span>
                        Показано: <strong>{filteredGroups.length}</strong> з{' '}
                        <strong>{groups.length}</strong>
                    </span>
                    <span>Студенти — кількість активних студентів у групі</span>
                </Card.Footer>
            </Card>

            {formModal && (
                <GroupFormModal
                    key={
                        formModal.mode === 'edit'
                            ? `edit-${formModal.group.id}`
                            : `create-${departmentFilterId ?? 'any'}-${programFilterId ?? 'any'}`
                    }
                    show
                    mode={formModal.mode}
                    editingGroup={formModal.mode === 'edit' ? formModal.group : null}
                    availablePrograms={availablePrograms}
                    availableDepartments={availableDepartments}
                    defaultDepartmentId={departmentFilterId}
                    defaultProgramId={programFilterId}
                    onHide={() => setFormModal(null)}
                    onSaved={handleActionSuccess}
                />
            )}

            {confirmModal && (
                <ConfirmGroupActionModal
                    key={`${confirmModal.action}-${confirmModal.group.id}`}
                    show
                    action={confirmModal.action}
                    group={confirmModal.group}
                    onHide={() => setConfirmModal(null)}
                    onCompleted={handleActionSuccess}
                />
            )}
        </Container>
    );
}
