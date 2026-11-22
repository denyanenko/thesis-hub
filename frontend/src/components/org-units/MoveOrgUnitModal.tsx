import { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import {
    ORG_UNIT_TYPE_LABELS,
    moveOrgUnit,
    type AdminActor,
    type HierarchyRuleItem,
    type OrgUnitTreeItem,
} from '../../api/orgUnits';

interface MoveOrgUnitModalProps {
    show: boolean;
    unit: OrgUnitTreeItem;
    allUnits: OrgUnitTreeItem[];
    actor: AdminActor;
    hierarchyRules: HierarchyRuleItem[];
    onHide: () => void;
    onMoved: (message: string) => Promise<void>;
}

const ROOT_VALUE = '__ROOT__';

export default function MoveOrgUnitModal({
    show,
    unit,
    allUnits,
    actor,
    hierarchyRules,
    onHide,
    onMoved,
}: MoveOrgUnitModalProps) {
    const [selectedValue, setSelectedValue] = useState<string>(() =>
        unit.parentId === null ? ROOT_VALUE : String(unit.parentId),
    );
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const { canMoveToRoot, candidates } = useMemo(() => {
        const byId = new Map(allUnits.map((u) => [u.id, u]));

        // Збираємо id самої одиниці та всіх її нащадків, щоб виключити цикли
        const childrenByParent = new Map<number, number[]>();
        for (const u of allUnits) {
            if (u.parentId !== null) {
                const list = childrenByParent.get(u.parentId) ?? [];
                list.push(u.id);
                childrenByParent.set(u.parentId, list);
            }
        }
        const forbiddenIds = new Set<number>([unit.id]);
        const queue = [unit.id];
        while (queue.length > 0) {
            const cur = queue.shift()!;
            for (const childId of childrenByParent.get(cur) ?? []) {
                if (!forbiddenIds.has(childId)) {
                    forbiddenIds.add(childId);
                    queue.push(childId);
                }
            }
        }

        const rootAllowedByRules = hierarchyRules.some(
            (r) => r.parentType === null && r.childType === unit.unitType,
        );
        const allowRoot =
            actor.isSuperAdmin && (!unit.isActive || rootAllowedByRules);

        const buildPath = (item: OrgUnitTreeItem): string => {
            const parts: string[] = [];
            let cur: OrgUnitTreeItem | undefined = item;
            let guard = 0;
            while (cur && guard < 64) {
                parts.unshift(cur.shortName ?? cur.name);
                cur = cur.parentId !== null ? byId.get(cur.parentId) : undefined;
                guard += 1;
            }
            return parts.join(' / ');
        };

        const validCandidates = allUnits
            .filter((candidate) => {
                if (!candidate.inScope) return false;
                if (forbiddenIds.has(candidate.id)) return false;
                if (unit.isActive) {
                    if (!candidate.isActive) return false;
                    if (!candidate.effectiveAllowedChildTypes.includes(unit.unitType)) {
                        return false;
                    }
                }
                return true;
            })
            .map((candidate) => ({
                id: candidate.id,
                label: `${buildPath(candidate)} (${ORG_UNIT_TYPE_LABELS[candidate.unitType]})`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'uk'));

        return { canMoveToRoot: allowRoot, candidates: validCandidates };
    }, [allUnits, actor.isSuperAdmin, hierarchyRules, unit]);

    const currentValue =
        unit.parentId === null ? ROOT_VALUE : String(unit.parentId);
    const hasChanged = selectedValue !== currentValue;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError(null);
        const targetParentId =
            selectedValue === ROOT_VALUE ? null : Number(selectedValue);
        setSubmitting(true);
        try {
            await moveOrgUnit(unit.id, targetParentId);
            await onMoved(`Підрозділ «${unit.name}» успішно переміщено.`);
            onHide();
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : 'Не вдалося перемістити підрозділ',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const hasAnyOption = canMoveToRoot || candidates.length > 0;

    return (
        <Modal show={show} onHide={submitting ? undefined : onHide} centered>
            <Modal.Header closeButton={!submitting}>
                <Modal.Title className="h5">Переміщення підрозділу</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <p className="small text-muted mb-3">
                        Оберіть новий батьківський підрозділ для{' '}
                        <strong className="text-dark">«{unit.name}»</strong> (
                        {ORG_UNIT_TYPE_LABELS[unit.unitType]}). У списку показані лише
                        сумісні підрозділи в межах ваших прав.
                    </p>

                    {serverError && (
                        <Alert variant="danger" className="py-2 small">
                            {serverError}
                        </Alert>
                    )}

                    {!hasAnyOption ? (
                        <Alert variant="warning" className="py-2 small mb-0">
                            Немає доступних підрозділів, куди можна перемістити цей підрозділ
                            згідно з правилами ієрархії.
                        </Alert>
                    ) : (
                        <Form.Group controlId="move-parent-select">
                            <Form.Label>Новий батьківський підрозділ</Form.Label>
                            <Form.Select
                                value={selectedValue}
                                disabled={submitting}
                                onChange={(e) => {
                                    setServerError(null);
                                    setSelectedValue(e.target.value);
                                }}
                            >
                                {canMoveToRoot && (
                                    <option value={ROOT_VALUE}>
                                        — Кореневий рівень (без батька) —
                                    </option>
                                )}
                                {candidates.map((c) => (
                                    <option key={c.id} value={String(c.id)}>
                                        {c.label}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="outline-secondary"
                        onClick={onHide}
                        disabled={submitting}
                    >
                        Скасувати
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={submitting || !hasAnyOption || !hasChanged}
                    >
                        {submitting ? (
                            <>
                                <Spinner size="sm" className="me-2" aria-hidden="true" />
                                Переміщення…
                            </>
                        ) : (
                            'Перемістити'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
