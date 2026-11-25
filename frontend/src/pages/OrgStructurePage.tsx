import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import {
    ORG_TREE_KEY,
    activateOrgUnit,
    fetchOrgUnitsTree,
    type OrgUnitTreeItem,
    type OrgUnitType,
} from '../api/orgUnits';
import OrgTree from '../components/org-units/OrgTree';
import OrgUnitDetailsPanel from '../components/org-units/OrgUnitDetailsPanel';
import OrgUnitFormModal from '../components/org-units/OrgUnitFormModal';
import MoveOrgUnitModal from '../components/org-units/MoveOrgUnitModal';
import ConfirmOrgActionModal from '../components/org-units/ConfirmOrgActionModal';
import HierarchyRulesMatrix from '../components/org-units/HierarchyRulesMatrix';

type ActiveTab = 'tree' | 'rules';

type FormModalState =
    | { mode: 'create'; parentUnit: OrgUnitTreeItem | null }
    | { mode: 'edit'; editingUnit: OrgUnitTreeItem }
    | null;

type ConfirmModalState = {
    action: 'deactivate' | 'delete';
    unit: OrgUnitTreeItem;
} | null;

const TYPE_ORDER: Record<OrgUnitType, number> = {
    university: 0,
    institute: 1,
    faculty: 2,
    department: 3,
};

export default function OrgStructurePage() {
    const queryClient = useQueryClient();
    const detailsColRef = useRef<HTMLDivElement | null>(null);

    const [activeTab, setActiveTab] = useState<ActiveTab>('tree');
    const [includeInactive, setIncludeInactive] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [formModal, setFormModal] = useState<FormModalState>(null);
    const [moveUnit, setMoveUnit] = useState<OrgUnitTreeItem | null>(null);
    const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null);

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: [...ORG_TREE_KEY, includeInactive],
        queryFn: () => fetchOrgUnitsTree(includeInactive),
    });

    const units = useMemo(() => data?.units ?? [], [data]);
    const hierarchyRules = useMemo(() => data?.hierarchyRules ?? [], [data]);
    const actor = data?.actor;

    const rootAllowedTypes = useMemo(
        () =>
            hierarchyRules
                .filter((r) => r.parentType === null)
                .map((r) => r.childType)
                .sort((a, b) => TYPE_ORDER[a] - TYPE_ORDER[b]),
        [hierarchyRules],
    );

    const effectiveSelectedUnit = useMemo(() => {
        if (units.length === 0) return null;
        if (selectedId !== null) {
            const found = units.find((u) => u.id === selectedId);
            if (found) return found;
        }
        if (actor && !actor.isSuperAdmin && actor.orgUnitId !== null) {
            const own = units.find((u) => u.id === actor.orgUnitId);
            if (own) return own;
        }
        return units[0];
    }, [units, selectedId, actor]);

    const handleSelectFromTree = (id: number) => {
        setSelectedId(id);
        if (window.innerWidth < 992) {
            detailsColRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    };

    const invalidateTree = async () => {
        await queryClient.invalidateQueries({ queryKey: ORG_TREE_KEY });
    };

    const handleFormSaved = async (savedId: number, message: string) => {
        await invalidateTree();
        setSelectedId(savedId);
        setSuccessMessage(message);
    };

    const handleMoved = async (message: string) => {
        await invalidateTree();
        setSuccessMessage(message);
    };

    const handleConfirmedAction = async (message: string, deletedId?: number) => {
        if (deletedId !== undefined && selectedId === deletedId) {
            setSelectedId(null);
        }
        await invalidateTree();
        setSuccessMessage(message);
    };

    const handleActivate = async (unit: OrgUnitTreeItem) => {
        await activateOrgUnit(unit.id);
        await invalidateTree();
        setSuccessMessage(`Підрозділ «${unit.name}» активовано.`);
    };

    const handleAllowedChildrenSaved = async (message: string) => {
        await invalidateTree();
        setSuccessMessage(message);
    };

    const handleHierarchyRulesSaved = async (message: string) => {
        await invalidateTree();
        setSuccessMessage(message);
    };

    const formAllowedTypes = useMemo<OrgUnitType[]>(() => {
        if (!formModal) return [];
        if (formModal.mode === 'create') {
            return formModal.parentUnit
                ? formModal.parentUnit.effectiveAllowedChildTypes
                : rootAllowedTypes;
        }
        const unit = formModal.editingUnit;
        if (unit.parentId === null) return rootAllowedTypes;
        const parent = units.find((u) => u.id === unit.parentId);
        return parent ? parent.effectiveAllowedChildTypes : [unit.unitType];
    }, [formModal, rootAllowedTypes, units]);

    const rulesVersionKey = useMemo(
        () =>
            hierarchyRules
                .map((r) => `${r.parentType ?? 'ROOT'}:${r.childType}`)
                .sort()
                .join('|'),
        [hierarchyRules],
    );

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
                            : 'Не вдалося завантажити організаційну структуру'}
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
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                    <h1 className="h4 mb-1">Організаційна структура</h1>
                    <div className="text-muted small">
                        {actor.isSuperAdmin ? (
                            <span>
                                Режим: <Badge bg="primary">Головний адміністратор</Badge> —
                                повний доступ до всіх підрозділів та загальних правил ієрархії
                            </span>
                        ) : (
                            <span>
                                Режим: <Badge bg="secondary">Адміністратор підрозділу</Badge> —
                                керування в межах свого підрозділу та підпорядкованих одиниць
                            </span>
                        )}
                    </div>
                </div>

                {actor.isSuperAdmin && activeTab === 'tree' && (
                    <Button
                        variant="primary"
                        size="sm"
                        disabled={rootAllowedTypes.length === 0}
                        title={
                            rootAllowedTypes.length === 0
                                ? 'У загальних правилах ієрархії не дозволено жодного кореневого типу'
                                : undefined
                        }
                        onClick={() => setFormModal({ mode: 'create', parentUnit: null })}
                    >
                        <i className="bi bi-plus-lg me-1" />
                        Додати кореневий підрозділ
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

            {actor.isSuperAdmin && (
                <Nav
                    variant="tabs"
                    activeKey={activeTab}
                    onSelect={(key) => {
                        if (key === 'tree' || key === 'rules') setActiveTab(key);
                    }}
                    className="mb-3"
                >
                    <Nav.Item>
                        <Nav.Link eventKey="tree">
                            <i className="bi bi-diagram-3 me-1" />
                            Дерево підрозділів
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="rules">
                            <i className="bi bi-sliders me-1" />
                            Загальні правила ієрархії
                        </Nav.Link>
                    </Nav.Item>
                </Nav>
            )}

            {activeTab === 'rules' && actor.isSuperAdmin ? (
                <HierarchyRulesMatrix
                    key={rulesVersionKey}
                    rules={hierarchyRules}
                    onSaved={handleHierarchyRulesSaved}
                />
            ) : (
                <Row className="g-4">
                    <Col lg={5}>
                        <Card className="shadow-sm">
                            <Card.Body>
                                <OrgTree
                                    units={units}
                                    selectedId={effectiveSelectedUnit?.id ?? null}
                                    includeInactive={includeInactive}
                                    onIncludeInactiveChange={setIncludeInactive}
                                    onSelect={handleSelectFromTree}
                                />
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={7} ref={detailsColRef}>
                        {effectiveSelectedUnit ? (
                            <OrgUnitDetailsPanel
                                key={`${effectiveSelectedUnit.id}:${effectiveSelectedUnit.unitType}:${effectiveSelectedUnit.allowedChildTypes?.join(',') ?? 'global'}:${rulesVersionKey}`}
                                unit={effectiveSelectedUnit}
                                allUnits={units}
                                hierarchyRules={hierarchyRules}
                                onSelectUnit={(id) => setSelectedId(id)}
                                onCreateChild={(parent) =>
                                    setFormModal({ mode: 'create', parentUnit: parent })
                                }
                                onEdit={(u) =>
                                    setFormModal({ mode: 'edit', editingUnit: u })
                                }
                                onMove={(u) => setMoveUnit(u)}
                                onDeactivate={(u) =>
                                    setConfirmModal({ action: 'deactivate', unit: u })
                                }
                                onActivate={handleActivate}
                                onDelete={(u) =>
                                    setConfirmModal({ action: 'delete', unit: u })
                                }
                                onAllowedChildrenSaved={handleAllowedChildrenSaved}
                            />
                        ) : (
                            <Card className="shadow-sm">
                                <Card.Body className="text-center text-muted py-5">
                                    <i className="bi bi-diagram-3 fs-2 d-block mb-2" />
                                    {actor.isSuperAdmin
                                        ? 'Оберіть підрозділ у дереві або створіть перший кореневий підрозділ.'
                                        : 'Немає доступних підрозділів для відображення.'}
                                </Card.Body>
                            </Card>
                        )}
                    </Col>
                </Row>
            )}

            {formModal && (
                <OrgUnitFormModal
                    key={
                        formModal.mode === 'create'
                            ? `create:${formModal.parentUnit?.id ?? 'root'}`
                            : `edit:${formModal.editingUnit.id}`
                    }
                    show
                    mode={formModal.mode}
                    parentUnit={formModal.mode === 'create' ? formModal.parentUnit : null}
                    editingUnit={formModal.mode === 'edit' ? formModal.editingUnit : null}
                    allowedTypes={formAllowedTypes}
                    canChangeType={
                        formModal.mode === 'edit' ? formModal.editingUnit.canManage : true
                    }
                    onHide={() => setFormModal(null)}
                    onSaved={handleFormSaved}
                />
            )}

            {moveUnit && (
                <MoveOrgUnitModal
                    key={`move:${moveUnit.id}:${moveUnit.parentId ?? 'root'}`}
                    show
                    unit={moveUnit}
                    allUnits={units}
                    actor={actor}
                    hierarchyRules={hierarchyRules}
                    onHide={() => setMoveUnit(null)}
                    onMoved={handleMoved}
                />
            )}

            {confirmModal && (
                <ConfirmOrgActionModal
                    key={`confirm:${confirmModal.action}:${confirmModal.unit.id}`}
                    show
                    action={confirmModal.action}
                    unit={confirmModal.unit}
                    onHide={() => setConfirmModal(null)}
                    onConfirmed={handleConfirmedAction}
                />
            )}
        </Container>
    );
}
