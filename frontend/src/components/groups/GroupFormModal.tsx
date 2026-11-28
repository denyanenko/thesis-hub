import { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import {
    DEGREE_LEVEL_SHORT_LABELS,
    type ProgramDepartmentRef,
} from '../../api/educationalPrograms';
import {
    createGroup,
    updateGroup,
    type GroupItem,
    type GroupProgramRef,
} from '../../api/groups';

interface GroupFormModalProps {
    show: boolean;
    mode: 'create' | 'edit';
    editingGroup: GroupItem | null;
    availablePrograms: GroupProgramRef[];
    availableDepartments: ProgramDepartmentRef[];
    defaultDepartmentId?: number | null;
    defaultProgramId?: number | null;
    onHide: () => void;
    onSaved: (message: string) => Promise<void>;
}

function groupDepartmentsByParent(departments: ProgramDepartmentRef[]) {
    const map = new Map<string, ProgramDepartmentRef[]>();
    for (const dept of departments) {
        const groupLabel = dept.parentShortName
            ? `${dept.parentShortName} — ${dept.parentName ?? ''}`
            : (dept.parentName ?? 'Інші підрозділи');
        const list = map.get(groupLabel) ?? [];
        list.push(dept);
        map.set(groupLabel, list);
    }
    return [...map.entries()];
}

export default function GroupFormModal({
    show,
    mode,
    editingGroup,
    availablePrograms,
    availableDepartments,
    defaultDepartmentId = null,
    defaultProgramId = null,
    onHide,
    onSaved,
}: GroupFormModalProps) {
    const activePrograms = useMemo(
        () => availablePrograms.filter((p) => p.isActive && p.department.isActive),
        [availablePrograms],
    );

    const selectablePrograms = useMemo(() => {
        if (
            mode === 'edit' &&
            editingGroup &&
            !activePrograms.some((p) => p.id === editingGroup.educationalProgramId)
        ) {
            return [editingGroup.program, ...activePrograms];
        }
        return activePrograms;
    }, [mode, editingGroup, activePrograms]);

    const selectableDepartments = useMemo(() => {
        const deptIdsWithPrograms = new Set(selectablePrograms.map((p) => p.department.id));
        const map = new Map<number, ProgramDepartmentRef>();
        for (const dept of availableDepartments) {
            if (deptIdsWithPrograms.has(dept.id)) {
                map.set(dept.id, dept);
            }
        }
        for (const prog of selectablePrograms) {
            if (!map.has(prog.department.id)) {
                map.set(prog.department.id, prog.department);
            }
        }
        return [...map.values()].sort((a, b) => {
            const pCmp = (a.parentShortName ?? a.parentName ?? '').localeCompare(
                b.parentShortName ?? b.parentName ?? '',
                'uk',
            );
            if (pCmp !== 0) return pCmp;
            return a.name.localeCompare(b.name, 'uk');
        });
    }, [availableDepartments, selectablePrograms]);

    const initialProgramId = useMemo<number | ''>(() => {
        if (mode === 'edit' && editingGroup) return editingGroup.educationalProgramId;
        if (
            defaultProgramId !== null &&
            selectablePrograms.some((p) => p.id === defaultProgramId)
        ) {
            return defaultProgramId;
        }
        return '';
    }, [mode, editingGroup, defaultProgramId, selectablePrograms]);

    const initialDepartmentId = useMemo<number | 'ALL'>(() => {
        if (mode === 'edit' && editingGroup) return editingGroup.program.department.id;
        if (typeof initialProgramId === 'number') {
            const prog = selectablePrograms.find((p) => p.id === initialProgramId);
            if (prog) return prog.department.id;
        }
        if (
            defaultDepartmentId !== null &&
            selectableDepartments.some((d) => d.id === defaultDepartmentId)
        ) {
            return defaultDepartmentId;
        }
        return selectableDepartments.length === 1 ? selectableDepartments[0].id : 'ALL';
    }, [
        mode,
        editingGroup,
        initialProgramId,
        defaultDepartmentId,
        selectablePrograms,
        selectableDepartments,
    ]);

    const [departmentFilter, setDepartmentFilter] = useState<number | 'ALL'>(initialDepartmentId);
    const [programSearch, setProgramSearch] = useState('');
    const [educationalProgramId, setEducationalProgramId] = useState<number | ''>(
        initialProgramId,
    );
    const [name, setName] = useState(mode === 'edit' && editingGroup ? editingGroup.name : '');
    const [enrollmentYear, setEnrollmentYear] = useState(
        mode === 'edit' && editingGroup
            ? editingGroup.enrollmentYear !== null
                ? String(editingGroup.enrollmentYear)
                : ''
            : String(new Date().getFullYear()),
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const departmentGroups = useMemo(
        () => groupDepartmentsByParent(selectableDepartments),
        [selectableDepartments],
    );

    const filteredPrograms = useMemo(() => {
        const q = programSearch.trim().toLowerCase();
        return selectablePrograms.filter((p) => {
            if (p.id === educationalProgramId) return true;
            if (departmentFilter !== 'ALL' && p.department.id !== departmentFilter) {
                return false;
            }
            if (!q) return true;
            const haystack = [
                p.name,
                p.specialty.code,
                p.specialty.name,
                p.department.name,
                p.department.shortName ?? '',
                DEGREE_LEVEL_SHORT_LABELS[p.degreeLevel],
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [selectablePrograms, departmentFilter, programSearch, educationalProgramId]);

    const isChangingProgramWithStudents =
        mode === 'edit' &&
        editingGroup !== null &&
        editingGroup.counts.students > 0 &&
        educationalProgramId !== editingGroup.educationalProgramId;

    const handleDepartmentChange = (value: string) => {
        const nextDept: number | 'ALL' = value === 'ALL' ? 'ALL' : Number(value);
        setDepartmentFilter(nextDept);
        if (
            nextDept !== 'ALL' &&
            typeof educationalProgramId === 'number' &&
            selectablePrograms.find((p) => p.id === educationalProgramId)?.department.id !==
                nextDept
        ) {
            setEducationalProgramId('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedName = name.trim();
        if (typeof educationalProgramId !== 'number') {
            setError('Оберіть освітню програму.');
            return;
        }
        if (!trimmedName) {
            setError('Вкажіть шифр (назву) групи.');
            return;
        }
        if (trimmedName.length > 64) {
            setError('Назва групи не може перевищувати 64 символи.');
            return;
        }

        let parsedYear: number | null = null;
        const trimmedYear = enrollmentYear.trim();
        if (trimmedYear) {
            const num = Number(trimmedYear);
            if (!Number.isInteger(num) || num < 1990 || num > 2100) {
                setError('Рік вступу повинен бути цілим числом від 1990 до 2100.');
                return;
            }
            parsedYear = num;
        }

        setSubmitting(true);
        try {
            if (mode === 'create') {
                await createGroup({
                    educationalProgramId,
                    name: trimmedName,
                    enrollmentYear: parsedYear,
                });
                await onSaved(`Академічну групу «${trimmedName}» створено.`);
            } else if (editingGroup) {
                await updateGroup(editingGroup.id, {
                    educationalProgramId,
                    name: trimmedName,
                    enrollmentYear: parsedYear,
                });
                await onSaved(`Академічну групу «${trimmedName}» оновлено.`);
            }
            onHide();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Не вдалося зберегти академічну групу',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={submitting ? undefined : onHide} centered size="lg">
            <Modal.Header closeButton={!submitting}>
                <Modal.Title className="h5">
                    {mode === 'create'
                        ? 'Нова академічна група'
                        : 'Редагування академічної групи'}
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit} noValidate>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" className="py-2 small">
                            {error}
                        </Alert>
                    )}

                    {isChangingProgramWithStudents && (
                        <Alert variant="warning" className="py-2 small mb-3">
                            <i className="bi bi-exclamation-triangle me-1" />У цій групі вже є
                            студенти ({editingGroup.counts.students}). Зміна освітньої програми
                            оновить її для всіх студентів групи.
                        </Alert>
                    )}

                    {selectableDepartments.length > 1 && (
                        <Form.Group className="mb-3" controlId="group-department-filter">
                            <Form.Label>Кафедра (для швидкого вибору ОП)</Form.Label>
                            <Form.Select
                                value={departmentFilter === 'ALL' ? 'ALL' : String(departmentFilter)}
                                onChange={(e) => handleDepartmentChange(e.target.value)}
                                disabled={submitting}
                            >
                                <option value="ALL">
                                    Усі доступні кафедри ({selectableDepartments.length})
                                </option>
                                {departmentGroups.length === 1
                                    ? departmentGroups[0][1].map((dept) => (
                                          <option key={dept.id} value={dept.id}>
                                              {dept.shortName ? `${dept.shortName} — ` : ''}
                                              {dept.name}
                                          </option>
                                      ))
                                    : departmentGroups.map(([groupLabel, depts]) => (
                                          <optgroup key={groupLabel} label={groupLabel}>
                                              {depts.map((dept) => (
                                                  <option key={dept.id} value={dept.id}>
                                                      {dept.shortName ? `${dept.shortName} — ` : ''}
                                                      {dept.name}
                                                  </option>
                                              ))}
                                          </optgroup>
                                      ))}
                            </Form.Select>
                        </Form.Group>
                    )}

                    <Form.Group className="mb-3" controlId="group-program">
                        <Form.Label>Освітня програма</Form.Label>
                        {selectablePrograms.length > 8 && (
                            <Form.Control
                                type="search"
                                size="sm"
                                className="mb-2"
                                placeholder="Швидкий фільтр ОП за назвою, спеціальністю або рівнем…"
                                value={programSearch}
                                onChange={(e) => setProgramSearch(e.target.value)}
                                disabled={submitting}
                            />
                        )}
                        <Form.Select
                            value={educationalProgramId}
                            onChange={(e) =>
                                setEducationalProgramId(
                                    e.target.value ? Number(e.target.value) : '',
                                )
                            }
                            disabled={submitting || selectablePrograms.length === 0}
                        >
                            <option value="">— Оберіть освітню програму —</option>
                            {filteredPrograms.map((p) => (
                                <option key={p.id} value={p.id}>
                                    [{p.specialty.code} · {DEGREE_LEVEL_SHORT_LABELS[p.degreeLevel]}
                                    ] {p.name}
                                    {departmentFilter === 'ALL' && p.department.shortName
                                        ? ` (${p.department.shortName})`
                                        : ''}
                                    {!p.isActive ? ' (неактивна)' : ''}
                                </option>
                            ))}
                        </Form.Select>
                        {selectablePrograms.length === 0 && (
                            <Form.Text className="text-danger">
                                У вашій зоні відповідальності немає жодної активної освітньої
                                програми.
                            </Form.Text>
                        )}
                    </Form.Group>

                    <Row className="g-3">
                        <Col xs={12} sm={7}>
                            <Form.Group controlId="group-name">
                                <Form.Label>Шифр (назва) групи</Form.Label>
                                <Form.Control
                                    type="text"
                                    maxLength={64}
                                    placeholder="Наприклад: ІС-51мп або ІП-41"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={submitting}
                                    autoFocus
                                />
                                <Form.Text className="text-muted">
                                    Назва має бути унікальною в межах обраної освітньої програми.
                                </Form.Text>
                            </Form.Group>
                        </Col>

                        <Col xs={12} sm={5}>
                            <Form.Group controlId="group-enrollment-year">
                                <Form.Label>Рік вступу (необовʼязково)</Form.Label>
                                <Form.Control
                                    type="number"
                                    min={1990}
                                    max={2100}
                                    placeholder="Наприклад: 2025"
                                    value={enrollmentYear}
                                    onChange={(e) => setEnrollmentYear(e.target.value)}
                                    disabled={submitting}
                                />
                                <Form.Text className="text-muted">
                                    Зручно для фільтрації за набором.
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={onHide} disabled={submitting}>
                        Скасувати
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={submitting || selectablePrograms.length === 0}
                    >
                        {submitting && <Spinner size="sm" className="me-2" aria-hidden="true" />}
                        {mode === 'create' ? 'Створити' : 'Зберегти'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
