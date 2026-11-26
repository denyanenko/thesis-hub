import { useEffect, useMemo, useRef, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import {
    ORG_UNIT_TYPE_BADGE_BG,
    ORG_UNIT_TYPE_LABELS,
    type OrgUnitTreeItem,
} from '../../api/orgUnits';

type TreeViewMode = 'detailed' | 'compact';

const TREE_VIEW_MODE_STORAGE_KEY = 'thesis-hub:org-tree-view-mode';

function getInitialViewMode(): TreeViewMode {
    try {
        const stored = window.localStorage.getItem(TREE_VIEW_MODE_STORAGE_KEY);
        if (stored === 'detailed' || stored === 'compact') {
            return stored;
        }
    } catch {
        // ignore storage access errors
    }
    return 'detailed';
}

interface OrgTreeProps {
    units: OrgUnitTreeItem[];
    selectedId: number | null;
    includeInactive: boolean;
    onIncludeInactiveChange: (value: boolean) => void;
    onSelect: (id: number) => void;
}

export default function OrgTree({
    units,
    selectedId,
    includeInactive,
    onIncludeInactiveChange,
    onSelect,
}: OrgTreeProps) {
    const [search, setSearch] = useState('');
    const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => new Set());
    const [viewMode, setViewMode] = useState<TreeViewMode>(getInitialViewMode);
    const selectedRowRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (selectedId !== null) {
            selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedId]);

    const handleViewModeChange = (mode: TreeViewMode) => {
        setViewMode(mode);
        try {
            window.localStorage.setItem(TREE_VIEW_MODE_STORAGE_KEY, mode);
        } catch {
            // ignore storage access errors
        }
    };

    const { childrenMap, roots, unitById } = useMemo(() => {
        const byId = new Map<number, OrgUnitTreeItem>();
        for (const u of units) byId.set(u.id, u);

        const cMap = new Map<number, OrgUnitTreeItem[]>();
        const rootList: OrgUnitTreeItem[] = [];

        for (const u of units) {
            if (u.parentId === null || !byId.has(u.parentId)) {
                rootList.push(u);
            } else {
                const list = cMap.get(u.parentId) ?? [];
                list.push(u);
                cMap.set(u.parentId, list);
            }
        }

        return { childrenMap: cMap, roots: rootList, unitById: byId };
    }, [units]);

    const normalizedSearch = search.trim().toLowerCase();

    const visibleIds = useMemo(() => {
        if (!normalizedSearch) return null;

        const visible = new Set<number>();
        for (const u of units) {
            const matchName = u.name.toLowerCase().includes(normalizedSearch);
            const matchShort =
                u.shortName?.toLowerCase().includes(normalizedSearch) ?? false;
            const matchType = ORG_UNIT_TYPE_LABELS[u.unitType]
                .toLowerCase()
                .includes(normalizedSearch);

            if (matchName || matchShort || matchType) {
                let current: OrgUnitTreeItem | undefined = u;
                while (current) {
                    visible.add(current.id);
                    current =
                        current.parentId !== null
                            ? unitById.get(current.parentId)
                            : undefined;
                }
            }
        }
        return visible;
    }, [normalizedSearch, units, unitById]);

    const toggleCollapse = (id: number) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandAll = () => setCollapsedIds(new Set());
    const collapseAll = () => {
        const parentIds = new Set<number>();
        for (const [parentId, children] of childrenMap.entries()) {
            if (children.length > 0) parentIds.add(parentId);
        }
        setCollapsedIds(parentIds);
    };

    const renderBadges = (unit: OrgUnitTreeItem, showShortName: boolean) => (
        <>
            <Badge
                bg={ORG_UNIT_TYPE_BADGE_BG[unit.unitType]}
                pill
                className="org-tree-badge"
            >
                {ORG_UNIT_TYPE_LABELS[unit.unitType]}
            </Badge>
            {showShortName && unit.shortName && (
                <span className="org-tree-shortname text-muted">
                    {unit.shortName}
                </span>
            )}
            {!unit.isActive && (
                <Badge bg="secondary" pill className="org-tree-badge">
                    Неакт.
                </Badge>
            )}
            {!unit.inScope && (
                <i
                    className="bi bi-lock-fill text-muted"
                    style={{ fontSize: '0.72rem' }}
                    title="Лише перегляд (вище вашого рівня)"
                />
            )}
        </>
    );

    const renderNode = (unit: OrgUnitTreeItem) => {
        if (visibleIds && !visibleIds.has(unit.id)) return null;

        const children = (childrenMap.get(unit.id) ?? []).filter(
            (child) => !visibleIds || visibleIds.has(child.id),
        );
        const hasChildren = children.length > 0;
        const isCollapsed = !normalizedSearch && collapsedIds.has(unit.id);
        const isSelected = selectedId === unit.id;
        const fullTitle = unit.shortName
            ? `${unit.name} (${unit.shortName})`
            : unit.name;

        return (
            <div key={unit.id}>
                <div
                    ref={isSelected ? selectedRowRef : undefined}
                    className={`org-tree-row d-flex align-items-start gap-2 px-2 rounded ${
                        viewMode === 'detailed' ? 'py-2' : 'py-1'
                    } ${isSelected ? 'org-tree-row-selected' : ''} ${
                        !unit.isActive ? 'opacity-50' : ''
                    } ${!unit.inScope ? 'text-muted' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(unit.id)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelect(unit.id);
                        }
                    }}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-secondary text-decoration-none org-tree-chevron"
                            aria-label={isCollapsed ? 'Розгорнути' : 'Згорнути'}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleCollapse(unit.id);
                            }}
                        >
                            <i
                                className={`bi ${
                                    isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'
                                }`}
                            />
                        </button>
                    ) : (
                        <span className="org-tree-chevron" />
                    )}

                    {viewMode === 'detailed' ? (
                        <div className="flex-grow-1 min-w-0">
                            <div className="org-tree-name fw-medium" title={fullTitle}>
                                {unit.name}
                            </div>
                            <div className="d-flex flex-wrap align-items-center gap-1 mt-1">
                                {renderBadges(unit, true)}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex-grow-1 min-w-0">
                                <div className="org-tree-name" title={fullTitle}>
                                    <span className="fw-medium">{unit.name}</span>
                                    {unit.shortName && (
                                        <span className="text-muted small ms-1">
                                            ({unit.shortName})
                                        </span>
                                    )}
                                </div>
                                <div className="d-flex d-sm-none flex-wrap align-items-center gap-1 mt-1">
                                    {renderBadges(unit, false)}
                                </div>
                            </div>

                            <div className="d-none d-sm-flex align-items-center gap-1 flex-shrink-0 pt-1">
                                {!unit.inScope && (
                                    <i
                                        className="bi bi-lock-fill text-muted"
                                        style={{ fontSize: '0.72rem' }}
                                        title="Лише перегляд (вище вашого рівня)"
                                    />
                                )}
                                {!unit.isActive && (
                                    <Badge bg="secondary" pill className="org-tree-badge">
                                        Неакт.
                                    </Badge>
                                )}
                                <Badge
                                    bg={ORG_UNIT_TYPE_BADGE_BG[unit.unitType]}
                                    pill
                                    className="org-tree-badge"
                                >
                                    {ORG_UNIT_TYPE_LABELS[unit.unitType]}
                                </Badge>
                            </div>
                        </>
                    )}
                </div>

                {hasChildren && !isCollapsed && (
                    <div className="org-tree-children">
                        {children.map((child) => renderNode(child))}
                    </div>
                )}
            </div>
        );
    };

    const visibleRoots = roots.filter((r) => !visibleIds || visibleIds.has(r.id));

    return (
        <div>
            <InputGroup size="sm" className="mb-2">
                <InputGroup.Text>
                    <i className="bi bi-search" />
                </InputGroup.Text>
                <Form.Control
                    type="search"
                    placeholder="Пошук за назвою або типом…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                    <Button
                        variant="outline-secondary"
                        onClick={() => setSearch('')}
                        aria-label="Очистити пошук"
                    >
                        <i className="bi bi-x" />
                    </Button>
                )}
            </InputGroup>

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <Form.Check
                    type="switch"
                    id="show-inactive-units"
                    label="Показати неактивні"
                    className="small mb-0"
                    checked={includeInactive}
                    onChange={(e) => onIncludeInactiveChange(e.target.checked)}
                />

                <div className="d-flex align-items-center gap-2">
                    <div
                        className="btn-group btn-group-sm"
                        role="group"
                        aria-label="Режим відображення дерева"
                    >
                        <Button
                            variant={
                                viewMode === 'detailed'
                                    ? 'secondary'
                                    : 'outline-secondary'
                            }
                            onClick={() => handleViewModeChange('detailed')}
                            title="Детальний вигляд (назва на всю ширину, тип під назвою)"
                            aria-pressed={viewMode === 'detailed'}
                        >
                            <i className="bi bi-view-stacked" />
                        </Button>
                        <Button
                            variant={
                                viewMode === 'compact'
                                    ? 'secondary'
                                    : 'outline-secondary'
                            }
                            onClick={() => handleViewModeChange('compact')}
                            title="Компактний вигляд (тип праворуч)"
                            aria-pressed={viewMode === 'compact'}
                        >
                            <i className="bi bi-list-ul" />
                        </Button>
                    </div>

                    {units.length > 0 && (
                        <div className="btn-group btn-group-sm">
                            <Button
                                variant="outline-secondary"
                                onClick={expandAll}
                                title="Розгорнути все"
                            >
                                <i className="bi bi-arrows-expand" />
                            </Button>
                            <Button
                                variant="outline-secondary"
                                onClick={collapseAll}
                                title="Згорнути все"
                            >
                                <i className="bi bi-arrows-collapse" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {visibleRoots.length === 0 ? (
                <div className="text-center text-muted py-4 small">
                    {normalizedSearch
                        ? 'За вашим запитом підрозділів не знайдено.'
                        : 'Підрозділів поки немає.'}
                </div>
            ) : (
                <div className="org-tree-container">
                    {visibleRoots.map((root) => renderNode(root))}
                </div>
            )}
        </div>
    );
}
