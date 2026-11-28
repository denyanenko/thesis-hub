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
    activateEducationalProgram,
    fetchEducationalPrograms,
    type DegreeLevel,
    type EducationalProgramItem,
    type ProgramDepartmentRef,
    type ProgramSpecialtyRef,
} from '../api/educationalPrograms';
import { GROUPS_KEY } from '../api/groups';
import { ORG_TREE_KEY, fetchOrgUnitsTree, type OrgUnitTreeItem } from '../api/orgUnits';
import { SPECIALTIES_KEY } from '../api/specialties';
import EducationalProgramFormModal from '../components/educational-programs/EducationalProgramFormModal';
import ReplaceEducationalProgramModal from '../components/educational-programs/ReplaceEducationalProgramModal';
import ConfirmEducationalProgramActionModal from '../components/educational-programs/ConfirmEducationalProgramActionModal';
import { getSpecialtyCodeStyle } from '../components/specialties/branchColors';

type StatusFilter = 'active' | 'all' | 'inactive' | 'replaced';

type FormModalState =
    | { mode: 'create' }
    | { mode: 'edit'; program: EducationalProgramItem }
    | null;

type ConfirmModalState = {
    action: 'deactivate' | 'delete';
    program: EducationalProgramItem;
} | null;

const VALID_STATUS_FILTERS: readonly StatusFilter[] = [
    'active',
    'all',
    'inactive',
    'replaced',
];

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

export default function EducationalProgramsPage() {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();

    const statusFilter = parseStatusFilter(searchParams.get('status'));
    const degreeFilter = parseDegreeFilter(searchParams.get('degree'));
    const unitFilterId = parsePositiveInt(searchParams.get('unitId'));
    const departmentFilterId = parsePositiveInt(searchParams.get('departmentId'));
    const specialtyFilterId = parsePositiveInt(searchParams.get('specialtyId'));
    const searchQuery = searchParams.get('q') ?? '';

    const departmentFilter = departmentFilterId !== null ? String(departmentFilterId) : 'ALL';
    const specialtyFilter = specialtyFilterId !== null ? String(specialtyFilterId) : 'ALL';

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [activatingId, setActivatingId] = useState<number | null>(null);

    const [formModal, setFormModal] = useState<FormModalState>(null);
    const [replacingProgram, setReplacingProgram] = useState<EducationalProgramItem | null>(null);
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
            if (nextDepartment === 'ALL') next.delete('departmentId');
            else next.set('departmentId', nextDepartment);
        });
    };

    const setSpecialtyFilter = (nextSpecialty: string) => {
        updateSearchParams((next) => {
            if (nextSpecialty === 'ALL') next.delete('specialtyId');
            else next.set('specialtyId', nextSpecialty);
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
        queryKey: [...EDUCATIONAL_PROGRAMS_KEY, true],
        queryFn: () => fetchEducationalPrograms(true),
    });

    const { data: orgTreeData } = useQuery({
        queryKey: [...ORG_TREE_KEY, true],
        queryFn: () => fetchOrgUnitsTree(true),
        enabled: unitFilterId !== null,
    });

    const programs = useMemo(() => data?.programs ?? [], [data]);
    const availableDepartments = useMemo(() => data?.availableDepartments ?? [], [data]);
    const activeSpecialties = useMemo(() => data?.activeSpecialties ?? [], [data]);
    const actor = data?.actor;

    const { scopedUnit, unitSubtreeDepartmentIds } = useMemo(() => {
        if (unitFilterId === null || !orgTreeData?.units) {
            return { scopedUnit: null as OrgUnitTreeItem | null, unitSubtreeDepartmentIds: null as Set<number> | null };
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
        for (const p of programs) {
            if (!unitSubtreeDepartmentIds || unitSubtreeDepartmentIds.has(p.department.id)) {
                map.set(p.department.id, p.department);
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
    }, [programs, availableDepartments, departmentFilterId, unitSubtreeDepartmentIds]);

    const specialtyOptions = useMemo(() => {
        const map = new Map<number, ProgramSpecialtyRef>();
        for (const p of programs) {
            map.set(p.specialty.id, p.specialty);
        }
        if (specialtyFilterId !== null && !map.has(specialtyFilterId)) {
            const found = activeSpecialties.find((s) => s.id === specialtyFilterId);
            if (found) map.set(found.id, found);
        }
        return [...map.values()].sort((a, b) =>
            a.code.localeCompare(b.code, 'uk', { numeric: true, sensitivity: 'base' }),
        );
    }, [programs, activeSpecialties, specialtyFilterId]);

    const selectedDepartmentObj = useMemo(
        () =>
            departmentFilterId !== null
                ? (availableDepartments.find((d) => d.id === departmentFilterId) ??
                  programs.find((p) => p.orgUnitId === departmentFilterId)?.department ??
                  null)
                : null,
        [departmentFilterId, availableDepartments, programs],
    );

    const selectedSpecialtyObj = useMemo(
        () =>
            specialtyFilterId !== null
                ? (specialtyOptions.find((s) => s.id === specialtyFilterId) ?? null)
                : null,
        [specialtyFilterId, specialtyOptions],
    );

    const contextPrograms = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return programs.filter((p) => {
            if (unitSubtreeDepartmentIds && !unitSubtreeDepartmentIds.has(p.orgUnitId)) {
                return false;
            }
            if (degreeFilter !== 'ALL' && p.degreeLevel !== degreeFilter) return false;
            if (departmentFilterId !== null && p.orgUnitId !== departmentFilterId) {
                return false;
            }
            if (specialtyFilterId !== null && p.specialtyId !== specialtyFilterId) {
                return false;
            }

            if (q) {
                const haystack = [
                    p.name,
                    p.specialty.code,
                    p.specialty.name,
                    p.department.name,
                    p.department.shortName ?? '',
                    p.department.parentName ?? '',
                    p.department.parentShortName ?? '',
                    p.replacedBy?.name ?? '',
                    ...p.replacedFrom.map((prev) => prev.name),
                ]
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(q)) return false;
            }

            return true;
        });
    }, [
        programs,
        unitSubtreeDepartmentIds,
        degreeFilter,
        departmentFilterId,
        specialtyFilterId,
        searchQuery,
    ]);

    const counts = useMemo(() => {
        let active = 0;
        let inactive = 0;
        let replaced = 0;
        for (const p of contextPrograms) {
            if (p.isActive) {
                active += 1;
            } else {
                inactive += 1;
                if (p.replacedById !== null) replaced += 1;
            }
        }
        return { total: contextPrograms.length, active, inactive, replaced };
    }, [contextPrograms]);

    const filteredPrograms = useMemo(() => {
        return contextPrograms.filter((p) => {
            if (statusFilter === 'active' && !p.isActive) return false;
            if (statusFilter === 'inactive' && p.isActive) return false;
            if (statusFilter === 'replaced' && p.replacedById === null) return false;
            return true;
        });
    }, [contextPrograms, statusFilter]);

    const hasActiveDepartments = useMemo(
        () => availableDepartments.some((d) => d.isActive),
        [availableDepartments],
    );

    const hasActiveContextFilters =
        unitFilterId !== null ||
        departmentFilterId !== null ||
        specialtyFilterId !== null ||
        degreeFilter !== 'ALL' ||
        searchQuery.trim().length > 0;

    const invalidateRelatedQueries = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: EDUCATIONAL_PROGRAMS_KEY }),
            queryClient.invalidateQueries({ queryKey: GROUPS_KEY }),
            queryClient.invalidateQueries({ queryKey: ORG_TREE_KEY }),
            queryClient.invalidateQueries({ queryKey: SPECIALTIES_KEY }),
        ]);
    };

    const handleActionSuccess = async (message: string) => {
        setActionError(null);
        await invalidateRelatedQueries();
        setSuccessMessage(message);
    };

    const handleActivate = async (program: EducationalProgramItem) => {
        setActionError(null);
        setActivatingId(program.id);
        try {
            await activateEducationalProgram(program.id);
            await handleActionSuccess(`Освітню програму «${program.name}» активовано.`);
        } catch (err) {
            setActionError(
                err instanceof Error ? err.message : 'Не вдалося активувати освітню програму',
            );
        } finally {
            setActivatingId(null);
        }
    };

    const handleJumpToName = (name: string) => {
        setSearchParams(
            new URLSearchParams({
                status: 'all',
                q: name,
            }),
            { replace: true },
        );
    };

    const renderStatusBadge = (p: EducationalProgramItem) => {
        if (p.isActive) {
            return <Badge bg="success">Активна</Badge>;
        }
        if (p.replacedBy) {
            return (
                <Badge bg="warning" text="dark">
                    Замінена
                </Badge>
            );
        }
        return <Badge bg="secondary">Неактивна</Badge>;
    };

    const renderDegreeBadge = (level: DegreeLevel) => (
        <span className="badge fw-semibold" style={DEGREE_BADGE_STYLES[level]}>
            {DEGREE_LEVEL_SHORT_LABELS[level]}
        </span>
    );

    const renderSpecialtyBadgeLink = (p: EducationalProgramItem) => (
        <Link
            to={`/admin/specialties?q=${encodeURIComponent(p.specialty.code)}&status=all`}
            className="badge font-monospace specialty-code-badge specialty-code-badge-link"
            style={getSpecialtyCodeStyle(p.specialty.code, p.specialty.isActive && p.isActive)}
            title={`Перейти до спеціальності ${p.specialty.code} — ${p.specialty.name}`}
        >
            {p.specialty.code}
        </Link>
    );

    const renderGroupsCountLink = (p: EducationalProgramItem, compact = false) => {
        const activeCount = p.counts.activeGroups;
        const to = `/admin/groups?programId=${p.id}`;
        const title =
            activeCount > 0
                ? `Перейти до активних груп освітньої програми (${activeCount})`
                : 'Перейти до груп освітньої програми (поки немає активних)';

        if (activeCount === 0 && !p.isActive) {
            return (
                <span className="small text-muted text-nowrap" title="Активних груп немає">
                    {compact ? 'Груп: 0' : '0'}
                </span>
            );
        }

        return (
            <Link
                to={to}
                className={`small entity-link text-nowrap ${
                    activeCount > 0 ? 'text-primary' : 'text-muted'
                }`}
                title={title}
            >
                {compact && 'Груп: '}
                {activeCount > 0 ? <strong>{activeCount}</strong> : <span>0</span>}
                {activeCount > 0 && (
                    <i
                        className="bi bi-arrow-up-right ms-1"
                        style={{ fontSize: '0.65rem' }}
                        aria-hidden="true"
                    />
                )}
            </Link>
        );
    };

    const renderSuccessionMeta = (p: EducationalProgramItem) => {
        const deactivatedDate = formatDateUk(p.deactivatedAt);
        const showChainEnd =
            p.currentReplacement !== null &&
            p.replacedBy !== null &&
            p.currentReplacement.id !== p.replacedBy.id;

        return (
            <div className="d-flex flex-column gap-1 mt-1">
                {p.replacedBy && (
                    <div className="small text-muted d-flex flex-wrap align-items-center gap-1">
                        <span>Замінено на:</span>
                        <Button
                            variant="link"
                            size="sm"
                            className="p-0 align-baseline text-decoration-none fw-medium text-start"
                            onClick={() => handleJumpToName(p.replacedBy!.name)}
                        >
                            [{p.replacedBy.specialtyCode}] {p.replacedBy.name}
                        </Button>
                        {showChainEnd && p.currentReplacement && (
                            <>
                                <i className="bi bi-arrow-right text-primary" />
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 align-baseline text-decoration-none fw-medium text-start"
                                    onClick={() => handleJumpToName(p.currentReplacement!.name)}
                                >
                                    [{p.currentReplacement.specialtyCode}]{' '}
                                    {p.currentReplacement.name}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {p.replacedFrom.length > 0 && (
                    <div className="small text-muted d-flex flex-wrap align-items-center gap-1">
                        <span>Правонаступник для:</span>
                        {p.replacedFrom.map((prev, idx) => (
                            <span key={prev.id}>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="p-0 align-baseline text-decoration-none text-start"
                                    onClick={() => handleJumpToName(prev.name)}
                                >
                                    [{prev.specialtyCode}] {prev.name}
                                </Button>
                                {idx < p.replacedFrom.length - 1 ? '; ' : ''}
                            </span>
                        ))}
                    </div>
                )}

                {!p.isActive && (deactivatedDate || p.deactivationReason) && (
                    <div className="small text-muted">
                        {deactivatedDate && <span>Деактивовано {deactivatedDate}</span>}
                        {deactivatedDate && p.deactivationReason && <span> · </span>}
                        {p.deactivationReason && <span>{p.deactivationReason}</span>}
                    </div>
                )}
            </div>
        );
    };

    const renderActions = (p: EducationalProgramItem) => {
        const isActivating = activatingId === p.id;

        return (
            <div className="d-flex flex-wrap gap-1 justify-content-lg-end">
                <Button
                    size="sm"
                    variant="outline-secondary"
                    title="Редагувати освітню програму"
                    onClick={() => setFormModal({ mode: 'edit', program: p })}
                >
                    <i className="bi bi-pencil" />
                    <span className="d-lg-none ms-1">Редагувати</span>
                </Button>

                {p.replacedById === null && (
                    <Button
                        size="sm"
                        variant="outline-primary"
                        title="Замінити / перейменувати правонаступником"
                        onClick={() => setReplacingProgram(p)}
                    >
                        <i className="bi bi-arrow-left-right" />
                        <span className="d-lg-none ms-1">Замінити</span>
                    </Button>
                )}

                {p.isActive ? (
                    <Button
                        size="sm"
                        variant="outline-warning"
                        title="Деактивувати без правонаступника"
                        onClick={() => setConfirmModal({ action: 'deactivate', program: p })}
                    >
                        <i className="bi bi-pause-circle" />
                        <span className="d-lg-none ms-1">Деактивувати</span>
                    </Button>
                ) : (
                    p.replacedById === null && (
                        <Button
                            size="sm"
                            variant="outline-success"
                            title="Повторно активувати"
                            disabled={isActivating}
                            onClick={() => handleActivate(p)}
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

                {p.canDelete && (
                    <Button
                        size="sm"
                        variant="outline-danger"
                        title="Видалити порожню освітню програму"
                        onClick={() => setConfirmModal({ action: 'delete', program: p })}
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
                            : 'Не вдалося завантажити освітні програми'}
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
                    <h1 className="h4 mb-1">Освітні програми</h1>
                    <div className="text-muted small">
                        {actor.isSuperAdmin ? (
                            <span>
                                Режим: <Badge bg="primary">Головний адміністратор</Badge> —
                                керування освітніми програмами всіх кафедр університету
                            </span>
                        ) : (
                            <span>
                                Режим: <Badge bg="secondary">Адміністратор підрозділу</Badge> —
                                керування освітніми програмами кафедр у межах вашого підрозділу
                            </span>
                        )}
                    </div>
                </div>

                <Button
                    variant="primary"
                    disabled={!hasActiveDepartments || activeSpecialties.length === 0}
                    onClick={() => setFormModal({ mode: 'create' })}
                    title={
                        !hasActiveDepartments
                            ? 'У вашій зоні відповідальності немає активних кафедр'
                            : activeSpecialties.length === 0
                              ? 'Немає активних спеціальностей'
                              : undefined
                    }
                >
                    <i className="bi bi-plus-lg me-1" />
                    Додати освітню програму
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

            {(scopedUnit || selectedDepartmentObj || selectedSpecialtyObj) && (
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

                        {selectedSpecialtyObj && (
                            <span className="d-inline-flex align-items-center gap-1 bg-white border rounded px-2 py-1">
                                <i className="bi bi-journal-bookmark text-primary" />
                                <Link
                                    to={`/admin/specialties?q=${encodeURIComponent(
                                        selectedSpecialtyObj.code,
                                    )}&status=all`}
                                    className="entity-link fw-medium"
                                    title="Відкрити спеціальність у довіднику"
                                >
                                    {selectedSpecialtyObj.code} — {selectedSpecialtyObj.name}
                                </Link>
                                <button
                                    type="button"
                                    className="btn-close ms-1"
                                    style={{ fontSize: '0.6rem' }}
                                    aria-label="Скинути фільтр спеціальності"
                                    onClick={() => setSpecialtyFilter('ALL')}
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
                        <Col xs={12} xl={5}>
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

                        <Col xs={12} sm={6} md={4} xl={2}>
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

                        <Col xs={12} sm={6} md={4} xl={2}>
                            <Form.Select
                                size="sm"
                                aria-label="Фільтр за спеціальністю"
                                value={specialtyFilter}
                                onChange={(e) => setSpecialtyFilter(e.target.value)}
                            >
                                <option value="ALL">Усі спеціальності</option>
                                {specialtyOptions.map((s) => (
                                    <option key={s.id} value={String(s.id)}>
                                        {s.code} — {s.name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>

                        <Col xs={12} md={4} xl={3}>
                            <InputGroup size="sm">
                                <InputGroup.Text>
                                    <i className="bi bi-search" />
                                </InputGroup.Text>
                                <Form.Control
                                    type="search"
                                    placeholder="Пошук за назвою, кафедрою…"
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
                            <Col xs={12} md={6} lg={5}>
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
                    </Row>
                </Card.Body>

                {filteredPrograms.length === 0 ? (
                    <Card.Body className="text-center text-muted py-5">
                        <i className="bi bi-mortarboard fs-1 d-block mb-2 opacity-50" />
                        {programs.length === 0 ? (
                            <div>
                                У вашій зоні відповідальності поки немає освітніх програм. Натисніть{' '}
                                <strong>«Додати освітню програму»</strong>, щоб створити першу.
                            </div>
                        ) : (
                            <div className="d-flex flex-column align-items-center gap-2">
                                <span>За обраними фільтрами освітніх програм не знайдено.</span>
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
                        )}
                    </Card.Body>
                ) : (
                    <>
                        {/* Десктопна таблиця */}
                        <div className="d-none d-lg-block table-responsive">
                            <Table hover className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: '105px' }}>Спец.</th>
                                        <th>Освітня програма</th>
                                        <th style={{ width: '115px' }}>Рівень</th>
                                        <th style={{ width: '210px' }}>Кафедра</th>
                                        <th style={{ width: '115px' }}>Статус</th>
                                        <th style={{ width: '85px' }} className="text-center">
                                            Групи
                                        </th>
                                        <th style={{ width: '185px' }} className="text-end">
                                            Дії
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPrograms.map((p) => (
                                        <tr
                                            key={p.id}
                                            className={p.isActive ? undefined : 'table-light'}
                                        >
                                            <td>{renderSpecialtyBadgeLink(p)}</td>
                                            <td>
                                                <div
                                                    className={
                                                        p.isActive
                                                            ? 'fw-medium specialty-name'
                                                            : 'text-muted specialty-name'
                                                    }
                                                >
                                                    {p.name}
                                                </div>
                                                <div className="small text-muted">
                                                    {p.specialty.name}
                                                    {!p.specialty.isActive && (
                                                        <span className="ms-1 text-warning-emphasis">
                                                            (спеціальність неактивна)
                                                        </span>
                                                    )}
                                                </div>
                                                {renderSuccessionMeta(p)}
                                            </td>
                                            <td>{renderDegreeBadge(p.degreeLevel)}</td>
                                            <td>
                                                <div className="small fw-medium specialty-name">
                                                    <Link
                                                        to={`/admin/org-structure?unitId=${p.department.id}${
                                                            !p.department.isActive
                                                                ? '&includeInactive=1'
                                                                : ''
                                                        }`}
                                                        className="entity-link"
                                                        title="Відкрити кафедру в організаційній структурі"
                                                    >
                                                        {p.department.shortName ??
                                                            p.department.name}
                                                    </Link>
                                                </div>
                                                <div className="small text-muted specialty-name">
                                                    {p.department.parentShortName
                                                        ? `${p.department.parentShortName} · `
                                                        : ''}
                                                    {p.department.shortName
                                                        ? p.department.name
                                                        : (p.department.parentName ?? '')}
                                                </div>
                                            </td>
                                            <td>{renderStatusBadge(p)}</td>
                                            <td className="text-center">
                                                {renderGroupsCountLink(p, false)}
                                            </td>
                                            <td className="text-end">{renderActions(p)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>

                        {/* Мобільний / планшетний список карток */}
                        <div className="d-lg-none">
                            {filteredPrograms.map((p) => (
                                <div
                                    key={p.id}
                                    className={`p-3 border-bottom ${p.isActive ? '' : 'bg-light'}`}
                                >
                                    <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            {renderSpecialtyBadgeLink(p)}
                                            {renderDegreeBadge(p.degreeLevel)}
                                            {renderStatusBadge(p)}
                                        </div>
                                        {renderGroupsCountLink(p, true)}
                                    </div>

                                    <div
                                        className={`specialty-name ${
                                            p.isActive ? 'fw-medium' : 'text-muted'
                                        }`}
                                    >
                                        {p.name}
                                    </div>

                                    <div className="small text-muted mt-1">
                                        {p.specialty.name}
                                    </div>

                                    <div className="small text-muted mt-1">
                                        <i className="bi bi-building me-1" />
                                        {p.department.parentShortName
                                            ? `${p.department.parentShortName} → `
                                            : ''}
                                        <Link
                                            to={`/admin/org-structure?unitId=${p.department.id}${
                                                !p.department.isActive ? '&includeInactive=1' : ''
                                            }`}
                                            className="entity-link"
                                            title="Відкрити кафедру в організаційній структурі"
                                        >
                                            {p.department.shortName
                                                ? `${p.department.shortName} (${p.department.name})`
                                                : p.department.name}
                                        </Link>
                                    </div>

                                    {renderSuccessionMeta(p)}

                                    <div className="mt-2 pt-2 border-top">{renderActions(p)}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <Card.Footer className="bg-white text-muted small d-flex justify-content-between flex-wrap gap-2">
                    <span>
                        Показано: <strong>{filteredPrograms.length}</strong> з{' '}
                        <strong>{programs.length}</strong>
                    </span>
                    <span>Групи — кількість активних академічних груп освітньої програми</span>
                </Card.Footer>
            </Card>

            {formModal && (
                <EducationalProgramFormModal
                    key={
                        formModal.mode === 'edit'
                            ? `edit-${formModal.program.id}`
                            : `create-${departmentFilterId ?? 'any'}-${specialtyFilterId ?? 'any'}`
                    }
                    show
                    mode={formModal.mode}
                    editingProgram={formModal.mode === 'edit' ? formModal.program : null}
                    availableDepartments={availableDepartments}
                    activeSpecialties={activeSpecialties}
                    defaultOrgUnitId={departmentFilterId}
                    defaultSpecialtyId={specialtyFilterId}
                    onHide={() => setFormModal(null)}
                    onSaved={handleActionSuccess}
                />
            )}

            {replacingProgram && (
                <ReplaceEducationalProgramModal
                    key={`replace-${replacingProgram.id}`}
                    show
                    sourceProgram={replacingProgram}
                    allPrograms={programs}
                    availableDepartments={availableDepartments}
                    activeSpecialties={activeSpecialties}
                    onHide={() => setReplacingProgram(null)}
                    onReplaced={handleActionSuccess}
                />
            )}

            {confirmModal && (
                <ConfirmEducationalProgramActionModal
                    key={`${confirmModal.action}-${confirmModal.program.id}`}
                    show
                    action={confirmModal.action}
                    program={confirmModal.program}
                    onHide={() => setConfirmModal(null)}
                    onCompleted={handleActionSuccess}
                />
            )}
        </Container>
    );
}
