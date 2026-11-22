import { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Breadcrumb from 'react-bootstrap/Breadcrumb';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import {
    ORG_UNIT_TYPE_BADGE_BG,
    ORG_UNIT_TYPE_LABELS,
    setAllowedChildren,
    type HierarchyRuleItem,
    type OrgUnitTreeItem,
    type OrgUnitType,
} from '../../api/orgUnits';

interface OrgUnitDetailsPanelProps {
    unit: OrgUnitTreeItem;
    allUnits: OrgUnitTreeItem[];
    hierarchyRules: HierarchyRuleItem[];
    onSelectUnit: (id: number) => void;
    onCreateChild: (parent: OrgUnitTreeItem) => void;
    onEdit: (unit: OrgUnitTreeItem) => void;
    onMove: (unit: OrgUnitTreeItem) => void;
    onDeactivate: (unit: OrgUnitTreeItem) => void;
    onActivate: (unit: OrgUnitTreeItem) => Promise<void>;
    onDelete: (unit: OrgUnitTreeItem) => void;
    onAllowedChildrenSaved: (message: string) => Promise<void>;
}

const TYPE_ORDER: Record<OrgUnitType, number> = {
    university: 0,
    institute: 1,
    faculty: 2,
    department: 3,
};

export default function OrgUnitDetailsPanel({
    unit,
    allUnits,
    hierarchyRules,
    onSelectUnit,
    onCreateChild,
    onEdit,
    onMove,
    onDeactivate,
    onActivate,
    onDelete,
    onAllowedChildrenSaved,
}: OrgUnitDetailsPanelProps) {
    const [activating, setActivating] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const globalAllowedTypes = useMemo(
        () =>
            hierarchyRules
                .filter((r) => r.parentType === unit.unitType)
                .map((r) => r.childType)
                .sort((a, b) => TYPE_ORDER[a] - TYPE_ORDER[b]),
        [hierarchyRules, unit.unitType],
    );

    const [useGlobal, setUseGlobal] = useState<boolean>(
        () => unit.allowedChildTypes === null,
    );
    const [selectedChildTypes, setSelectedChildTypes] = useState<OrgUnitType[]>(
        () => unit.allowedChildTypes ?? globalAllowedTypes,
    );
    const [savingRules, setSavingRules] = useState(false);
    const [rulesError, setRulesError] = useState<string | null>(null);

    const breadcrumbs = useMemo(() => {
        const byId = new Map(allUnits.map((u) => [u.id, u]));
        const chain: OrgUnitTreeItem[] = [];
        let cur: OrgUnitTreeItem | undefined = unit;
        let guard = 0;
        while (cur && guard < 64) {
            chain.unshift(cur);
            cur = cur.parentId !== null ? byId.get(cur.parentId) : undefined;
            guard += 1;
        }
        return chain;
    }, [allUnits, unit]);

    const parentUnit =
        unit.parentId !== null
            ? allUnits.find((u) => u.id === unit.parentId) ?? null
            : null;

    const rulesDirty = useMemo(() => {
        if (useGlobal) return unit.allowedChildTypes !== null;
        if (unit.allowedChildTypes === null) return true;
        if (unit.allowedChildTypes.length !== selectedChildTypes.length) return true;
        const set = new Set(unit.allowedChildTypes);
        return selectedChildTypes.some((t) => !set.has(t));
    }, [useGlobal, selectedChildTypes, unit.allowedChildTypes]);

    const toggleChildType = (type: OrgUnitType) => {
        setRulesError(null);
        setSelectedChildTypes((prev) =>
            prev.includes(type)
                ? prev.filter((t) => t !== type)
                : [...prev, type].sort((a, b) => TYPE_ORDER[a] - TYPE_ORDER[b]),
        );
    };

    const handleSaveAllowedChildren = async () => {
        setRulesError(null);
        if (!useGlobal && selectedChildTypes.length === 0) {
            setRulesError(
                'Оберіть щонайменше один дозволений дочірній тип або увімкніть використання загальних правил.',
            );
            return;
        }
        setSavingRules(true);
        try {
            await setAllowedChildren(unit.id, useGlobal ? null : selectedChildTypes);
            await onAllowedChildrenSaved(
                useGlobal
                    ? `Для «${unit.name}» увімкнено загальні правила ієрархії.`
                    : `Локальні правила дочірніх підрозділів для «${unit.name}» збережено.`,
            );
        } catch (err) {
            setRulesError(
                err instanceof Error ? err.message : 'Не вдалося зберегти локальні правила',
            );
        } finally {
            setSavingRules(false);
        }
    };

    const handleActivateClick = async () => {
        setActionError(null);
        setActivating(true);
        try {
            await onActivate(unit);
        } catch (err) {
            setActionError(
                err instanceof Error ? err.message : 'Не вдалося активувати підрозділ',
            );
        } finally {
            setActivating(false);
        }
    };

    const canAddChild =
        unit.canEdit && unit.isActive && unit.effectiveAllowedChildTypes.length > 0;

    return (
        <div className="d-flex flex-column gap-3">
            <Card className="shadow-sm">
                <Card.Body>
                    {breadcrumbs.length > 1 && (
                        <Breadcrumb className="small mb-2">
                            {breadcrumbs.map((crumb, idx) =>
                                idx === breadcrumbs.length - 1 ? (
                                    <Breadcrumb.Item key={crumb.id} active>
                                        {crumb.shortName ?? crumb.name}
                                    </Breadcrumb.Item>
                                ) : (
                                    <Breadcrumb.Item
                                        key={crumb.id}
                                        onClick={() => onSelectUnit(crumb.id)}
                                    >
                                        {crumb.shortName ?? crumb.name}
                                    </Breadcrumb.Item>
                                ),
                            )}
                        </Breadcrumb>
                    )}

                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                        <div>
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                <Badge bg={ORG_UNIT_TYPE_BADGE_BG[unit.unitType]}>
                                    {ORG_UNIT_TYPE_LABELS[unit.unitType]}
                                </Badge>
                                <Badge bg={unit.isActive ? 'success' : 'secondary'}>
                                    {unit.isActive ? 'Активний' : 'Неактивний'}
                                </Badge>
                                {!unit.inScope && (
                                    <Badge bg="light" text="dark" className="border">
                                        <i className="bi bi-lock-fill me-1" />
                                        Лише перегляд
                                    </Badge>
                                )}
                            </div>
                            <h2 className="h5 mb-0">{unit.name}</h2>
                            {unit.shortName && (
                                <div className="text-muted small mt-1">
                                    Скорочення: <strong>{unit.shortName}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="small text-muted mb-3">
                        Батьківський підрозділ:{' '}
                        {parentUnit ? (
                            <button
                                type="button"
                                className="btn btn-link btn-sm p-0 align-baseline text-decoration-none"
                                onClick={() => onSelectUnit(parentUnit.id)}
                            >
                                {parentUnit.name}
                            </button>
                        ) : (
                            <span className="text-dark">Кореневий рівень</span>
                        )}
                    </div>

                    <Row className="g-2 mb-3">
                        <Col xs={6} sm={3}>
                            <div className="border rounded p-2 text-center bg-light">
                                <div className="fw-semibold">{unit.counts.children}</div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    Дочірні ({unit.counts.activeChildren} акт.)
                                </div>
                            </div>
                        </Col>
                        <Col xs={6} sm={3}>
                            <div className="border rounded p-2 text-center bg-light">
                                <div className="fw-semibold">{unit.counts.programs}</div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    Освітні програми
                                </div>
                            </div>
                        </Col>
                        <Col xs={6} sm={3}>
                            <div className="border rounded p-2 text-center bg-light">
                                <div className="fw-semibold">{unit.counts.supervisors}</div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    Керівники
                                </div>
                            </div>
                        </Col>
                        <Col xs={6} sm={3}>
                            <div className="border rounded p-2 text-center bg-light">
                                <div className="fw-semibold">{unit.counts.admins}</div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    Адміни
                                </div>
                            </div>
                        </Col>
                    </Row>

                    {actionError && (
                        <Alert variant="danger" className="py-2 small">
                            {actionError}
                        </Alert>
                    )}

                    {unit.canEdit ? (
                        <div className="d-flex flex-wrap gap-2">
                            {canAddChild && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => onCreateChild(unit)}
                                >
                                    <i className="bi bi-plus-lg me-1" />
                                    Додати дочірній
                                </Button>
                            )}

                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => onEdit(unit)}
                            >
                                <i className="bi bi-pencil me-1" />
                                Редагувати
                            </Button>

                            {unit.canManage && (
                                <>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => onMove(unit)}
                                    >
                                        <i className="bi bi-diagram-3 me-1" />
                                        Перемістити
                                    </Button>

                                    {unit.isActive ? (
                                        <Button
                                            variant="outline-warning"
                                            size="sm"
                                            onClick={() => onDeactivate(unit)}
                                        >
                                            <i className="bi bi-pause-circle me-1" />
                                            Деактивувати
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline-success"
                                            size="sm"
                                            onClick={handleActivateClick}
                                            disabled={activating}
                                        >
                                            {activating ? (
                                                <Spinner size="sm" className="me-1" />
                                            ) : (
                                                <i className="bi bi-play-circle me-1" />
                                            )}
                                            Активувати
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        disabled={!unit.canDelete}
                                        title={
                                            unit.canDelete
                                                ? 'Видалити підрозділ назавжди'
                                                : 'Видалити можна лише порожній підрозділ без дочірніх одиниць, програм, керівників і адмінів'
                                        }
                                        onClick={() => onDelete(unit)}
                                    >
                                        <i className="bi bi-trash me-1" />
                                        Видалити
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        <Alert variant="secondary" className="py-2 small mb-0">
                            Цей підрозділ розташований вище за ваш рівень адміністрування та
                            доступний лише для перегляду.
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            <Card className="shadow-sm">
                <Card.Body>
                    <h3 className="h6 mb-2">Дозволені дочірні типи для цього підрозділу</h3>

                    {globalAllowedTypes.length === 0 ? (
                        <p className="text-muted small mb-0">
                            За загальними правилами ієрархії тип «
                            {ORG_UNIT_TYPE_LABELS[unit.unitType]}» не може мати дочірніх
                            підрозділів.
                        </p>
                    ) : (
                        <>
                            <p className="text-muted small mb-3">
                                За замовчуванням застосовуються загальні правила ієрархії. За
                                потреби можна звузити перелік типів саме для цього підрозділу.
                            </p>

                            {rulesError && (
                                <Alert variant="danger" className="py-2 small">
                                    {rulesError}
                                </Alert>
                            )}

                            <Form.Check
                                type="switch"
                                id={`use-global-rules-${unit.id}`}
                                label="Використовувати загальні правила ієрархії"
                                className="mb-3"
                                disabled={!unit.canEdit || savingRules}
                                checked={useGlobal}
                                onChange={(e) => {
                                    setRulesError(null);
                                    const checked = e.target.checked;
                                    setUseGlobal(checked);
                                    if (!checked && selectedChildTypes.length === 0) {
                                        setSelectedChildTypes(globalAllowedTypes);
                                    }
                                }}
                            />

                            <div className="d-flex flex-wrap gap-3 mb-3">
                                {globalAllowedTypes.map((type) => (
                                    <Form.Check
                                        key={type}
                                        type="checkbox"
                                        id={`allowed-child-${unit.id}-${type}`}
                                        label={ORG_UNIT_TYPE_LABELS[type]}
                                        disabled={!unit.canEdit || useGlobal || savingRules}
                                        checked={
                                            useGlobal
                                                ? true
                                                : selectedChildTypes.includes(type)
                                        }
                                        onChange={() => toggleChildType(type)}
                                    />
                                ))}
                            </div>

                            {unit.canEdit && (
                                <div className="d-flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        disabled={!rulesDirty || savingRules}
                                        onClick={handleSaveAllowedChildren}
                                    >
                                        {savingRules ? (
                                            <>
                                                <Spinner size="sm" className="me-1" />
                                                Збереження…
                                            </>
                                        ) : (
                                            'Зберегти правила'
                                        )}
                                    </Button>

                                    {rulesDirty && (
                                        <Button
                                            size="sm"
                                            variant="outline-secondary"
                                            disabled={savingRules}
                                            onClick={() => {
                                                setRulesError(null);
                                                setUseGlobal(unit.allowedChildTypes === null);
                                                setSelectedChildTypes(
                                                    unit.allowedChildTypes ?? globalAllowedTypes,
                                                );
                                            }}
                                        >
                                            Скасувати
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
}
