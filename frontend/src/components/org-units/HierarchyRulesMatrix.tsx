import { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import {
    ORG_UNIT_TYPES,
    ORG_UNIT_TYPE_LABELS,
    replaceHierarchyRules,
    type HierarchyRuleItem,
    type OrgUnitType,
} from '../../api/orgUnits';

interface HierarchyRulesMatrixProps {
    rules: HierarchyRuleItem[];
    onSaved: (message: string) => Promise<void>;
}

const PARENT_COLUMNS: ReadonlyArray<OrgUnitType | null> = [
    null,
    ...ORG_UNIT_TYPES,
];

function ruleKey(childType: OrgUnitType, parentType: OrgUnitType | null): string {
    return `${parentType ?? 'ROOT'}->${childType}`;
}

export default function HierarchyRulesMatrix({
    rules,
    onSaved,
}: HierarchyRulesMatrixProps) {
    const initialSet = useMemo(
        () => new Set(rules.map((r) => ruleKey(r.childType, r.parentType))),
        [rules],
    );

    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
        () => new Set(initialSet),
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isDirty = useMemo(() => {
        if (selectedKeys.size !== initialSet.size) return true;
        for (const key of selectedKeys) {
            if (!initialSet.has(key)) return true;
        }
        return false;
    }, [selectedKeys, initialSet]);

    const toggleCell = (childType: OrgUnitType, parentType: OrgUnitType | null) => {
        setError(null);
        const key = ruleKey(childType, parentType);
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleSave = async () => {
        setError(null);
        setSaving(true);
        try {
            const payload: Array<{
                childType: OrgUnitType;
                parentType: OrgUnitType | null;
            }> = [];

            for (const parentType of PARENT_COLUMNS) {
                for (const childType of ORG_UNIT_TYPES) {
                    if (selectedKeys.has(ruleKey(childType, parentType))) {
                        payload.push({ childType, parentType });
                    }
                }
            }

            await replaceHierarchyRules(payload);
            await onSaved('Загальні правила ієрархії успішно оновлено.');
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося зберегти загальні правила ієрархії',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="shadow-sm">
            <Card.Body>
                <h2 className="h5 mb-2">Загальні правила ієрархії підрозділів</h2>
                <p className="text-muted small mb-3">
                    Позначте, які типи підрозділів (рядки) можуть підпорядковуватися кожному
                    батьківському типу (стовпці) або створюватися на кореневому рівні.
                    Правила не можна змінити, якщо вони суперечать уже наявним активним
                    підрозділам.
                </p>

                {error && (
                    <Alert variant="danger" className="py-2 small">
                        {error}
                    </Alert>
                )}

                <Table responsive bordered hover className="align-middle text-center mb-3">
                    <thead className="table-light">
                        <tr>
                            <th className="text-start">Дочірній тип \ Батько</th>
                            {PARENT_COLUMNS.map((parentType) => (
                                <th key={parentType ?? 'root'}>
                                    {parentType === null
                                        ? 'Корінь (без батька)'
                                        : ORG_UNIT_TYPE_LABELS[parentType]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ORG_UNIT_TYPES.map((childType) => (
                            <tr key={childType}>
                                <th className="text-start fw-medium">
                                    {ORG_UNIT_TYPE_LABELS[childType]}
                                </th>
                                {PARENT_COLUMNS.map((parentType) => {
                                    const key = ruleKey(childType, parentType);
                                    const checked = selectedKeys.has(key);
                                    return (
                                        <td key={key}>
                                            <Form.Check
                                                type="checkbox"
                                                id={`rule-${key}`}
                                                aria-label={`${ORG_UNIT_TYPE_LABELS[childType]} у ${
                                                    parentType
                                                        ? ORG_UNIT_TYPE_LABELS[parentType]
                                                        : 'корені'
                                                }`}
                                                className="d-inline-block m-0"
                                                checked={checked}
                                                disabled={saving}
                                                onChange={() =>
                                                    toggleCell(childType, parentType)
                                                }
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </Table>

                <div className="d-flex gap-2">
                    <Button
                        variant="primary"
                        size="sm"
                        disabled={!isDirty || saving}
                        onClick={handleSave}
                    >
                        {saving ? (
                            <>
                                <Spinner size="sm" className="me-2" aria-hidden="true" />
                                Збереження…
                            </>
                        ) : (
                            'Зберегти правила'
                        )}
                    </Button>

                    {isDirty && (
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={saving}
                            onClick={() => {
                                setError(null);
                                setSelectedKeys(new Set(initialSet));
                            }}
                        >
                            Скинути зміни
                        </Button>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
}
