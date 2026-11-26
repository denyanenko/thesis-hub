import { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import {
    DEGREE_LEVELS,
    DEGREE_LEVEL_LABELS,
    createEducationalProgram,
    updateEducationalProgram,
    type DegreeLevel,
    type EducationalProgramItem,
    type ProgramDepartmentRef,
    type ProgramSpecialtyRef,
} from '../../api/educationalPrograms';

interface EducationalProgramFormModalProps {
    show: boolean;
    mode: 'create' | 'edit';
    editingProgram: EducationalProgramItem | null;
    availableDepartments: ProgramDepartmentRef[];
    activeSpecialties: ProgramSpecialtyRef[];
    defaultOrgUnitId?: number | null;
    defaultSpecialtyId?: number | null;
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

export default function EducationalProgramFormModal({
    show,
    mode,
    editingProgram,
    availableDepartments,
    activeSpecialties,
    defaultOrgUnitId = null,
    defaultSpecialtyId = null,
    onHide,
    onSaved,
}: EducationalProgramFormModalProps) {
    const activeDepartments = useMemo(
        () => availableDepartments.filter((d) => d.isActive),
        [availableDepartments],
    );

    const selectableDepartments = useMemo(() => {
        if (
            mode === 'edit' &&
            editingProgram &&
            !activeDepartments.some((d) => d.id === editingProgram.orgUnitId)
        ) {
            return [editingProgram.department, ...activeDepartments];
        }
        return activeDepartments;
    }, [mode, editingProgram, activeDepartments]);

    const selectableSpecialties = useMemo(() => {
        if (
            mode === 'edit' &&
            editingProgram &&
            !activeSpecialties.some((s) => s.id === editingProgram.specialtyId)
        ) {
            return [editingProgram.specialty, ...activeSpecialties];
        }
        return activeSpecialties;
    }, [mode, editingProgram, activeSpecialties]);

    const [orgUnitId, setOrgUnitId] = useState<number | ''>(() => {
        if (mode === 'edit' && editingProgram) return editingProgram.orgUnitId;
        if (
            defaultOrgUnitId !== null &&
            activeDepartments.some((d) => d.id === defaultOrgUnitId)
        ) {
            return defaultOrgUnitId;
        }
        return activeDepartments.length === 1 ? activeDepartments[0].id : '';
    });
    const [specialtyId, setSpecialtyId] = useState<number | ''>(() => {
        if (mode === 'edit' && editingProgram) return editingProgram.specialtyId;
        if (
            defaultSpecialtyId !== null &&
            activeSpecialties.some((s) => s.id === defaultSpecialtyId)
        ) {
            return defaultSpecialtyId;
        }
        return '';
    });
    const [specialtySearch, setSpecialtySearch] = useState('');
    const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>(
        mode === 'edit' && editingProgram ? editingProgram.degreeLevel : 'bachelor',
    );
    const [name, setName] = useState(
        mode === 'edit' && editingProgram ? editingProgram.name : '',
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const departmentGroups = useMemo(
        () => groupDepartmentsByParent(selectableDepartments),
        [selectableDepartments],
    );

    const filteredSpecialties = useMemo(() => {
        const q = specialtySearch.trim().toLowerCase();
        if (!q) return selectableSpecialties;
        return selectableSpecialties.filter(
            (s) =>
                s.id === specialtyId ||
                s.code.toLowerCase().includes(q) ||
                s.name.toLowerCase().includes(q),
        );
    }, [selectableSpecialties, specialtySearch, specialtyId]);

    const isSubstantialChangeWithGroups =
        mode === 'edit' &&
        editingProgram !== null &&
        editingProgram.counts.groups > 0 &&
        (name.trim() !== editingProgram.name ||
            specialtyId !== editingProgram.specialtyId ||
            orgUnitId !== editingProgram.orgUnitId ||
            degreeLevel !== editingProgram.degreeLevel);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmedName = name.trim();
        if (typeof orgUnitId !== 'number') {
            setError('Оберіть кафедру.');
            return;
        }
        if (typeof specialtyId !== 'number') {
            setError('Оберіть спеціальність.');
            return;
        }
        if (!trimmedName) {
            setError('Вкажіть назву освітньої програми.');
            return;
        }
        if (trimmedName.length > 255) {
            setError('Назва освітньої програми не може перевищувати 255 символів.');
            return;
        }

        setSubmitting(true);
        try {
            if (mode === 'create') {
                await createEducationalProgram({
                    orgUnitId,
                    specialtyId,
                    degreeLevel,
                    name: trimmedName,
                });
                await onSaved(`Освітню програму «${trimmedName}» створено.`);
            } else if (editingProgram) {
                await updateEducationalProgram(editingProgram.id, {
                    orgUnitId,
                    specialtyId,
                    degreeLevel,
                    name: trimmedName,
                });
                await onSaved(`Освітню програму «${trimmedName}» оновлено.`);
            }
            onHide();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося зберегти освітню програму',
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
                        ? 'Нова освітня програма'
                        : 'Редагування освітньої програми'}
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit} noValidate>
                <Modal.Body>
                    {error && (
                        <Alert variant="danger" className="py-2 small">
                            {error}
                        </Alert>
                    )}

                    {mode === 'edit' && (
                        <Alert variant="light" className="border py-2 small mb-3">
                            Редагування на місці призначене для виправлення одруківок. Для
                            офіційного перейменування, переведення на нову спеціальність або
                            передачі на іншу кафедру скористайтеся дією <strong>«Замінити»</strong>,
                            щоб зберегти історію існуючих груп.
                        </Alert>
                    )}

                    {isSubstantialChangeWithGroups && (
                        <Alert variant="warning" className="py-2 small mb-3">
                            <i className="bi bi-exclamation-triangle me-1" />
                            До цієї ОП вже привʼязані академічні групи (
                            {editingProgram.counts.groups}). Редагування на місці змінить атрибути
                            для всіх повʼязаних груп.
                        </Alert>
                    )}

                    <Form.Group className="mb-3" controlId="edu-program-department">
                        <Form.Label>Випускова кафедра</Form.Label>
                        <Form.Select
                            value={orgUnitId}
                            onChange={(e) =>
                                setOrgUnitId(e.target.value ? Number(e.target.value) : '')
                            }
                            disabled={submitting || selectableDepartments.length === 0}
                        >
                            <option value="">— Оберіть кафедру —</option>
                            {departmentGroups.length === 1
                                ? departmentGroups[0][1].map((dept) => (
                                      <option key={dept.id} value={dept.id}>
                                          {dept.shortName ? `${dept.shortName} — ` : ''}
                                          {dept.name}
                                          {!dept.isActive ? ' (неактивна)' : ''}
                                      </option>
                                  ))
                                : departmentGroups.map(([groupLabel, depts]) => (
                                      <optgroup key={groupLabel} label={groupLabel}>
                                          {depts.map((dept) => (
                                              <option key={dept.id} value={dept.id}>
                                                  {dept.shortName ? `${dept.shortName} — ` : ''}
                                                  {dept.name}
                                                  {!dept.isActive ? ' (неактивна)' : ''}
                                              </option>
                                          ))}
                                      </optgroup>
                                  ))}
                        </Form.Select>
                        {selectableDepartments.length === 0 && (
                            <Form.Text className="text-danger">
                                У вашій зоні відповідальності немає жодної активної кафедри.
                            </Form.Text>
                        )}
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="edu-program-specialty">
                        <Form.Label>Спеціальність</Form.Label>
                        <Form.Control
                            type="search"
                            size="sm"
                            className="mb-2"
                            placeholder="Швидкий пошук спеціальності за кодом або назвою…"
                            value={specialtySearch}
                            onChange={(e) => setSpecialtySearch(e.target.value)}
                            disabled={submitting}
                        />
                        <Form.Select
                            value={specialtyId}
                            onChange={(e) =>
                                setSpecialtyId(e.target.value ? Number(e.target.value) : '')
                            }
                            disabled={submitting || selectableSpecialties.length === 0}
                        >
                            <option value="">
                                — Оберіть активну спеціальність ({filteredSpecialties.length}) —
                            </option>
                            {filteredSpecialties.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.code} — {s.name}
                                    {!s.isActive ? ' (неактивна)' : ''}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="edu-program-degree">
                        <Form.Label>Рівень вищої освіти</Form.Label>
                        <Form.Select
                            value={degreeLevel}
                            onChange={(e) => setDegreeLevel(e.target.value as DegreeLevel)}
                            disabled={submitting}
                        >
                            {DEGREE_LEVELS.map((level) => (
                                <option key={level} value={level}>
                                    {DEGREE_LEVEL_LABELS[level]}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group controlId="edu-program-name">
                        <Form.Label>Назва освітньої програми</Form.Label>
                        <Form.Control
                            type="text"
                            maxLength={255}
                            placeholder="Наприклад: Інформаційне забезпечення робототехнічних систем"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={submitting}
                        />
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={onHide} disabled={submitting}>
                        Скасувати
                    </Button>
                    <Button
                        variant="primary"
                        type="submit"
                        disabled={submitting || selectableDepartments.length === 0}
                    >
                        {submitting && <Spinner size="sm" className="me-2" aria-hidden="true" />}
                        {mode === 'create' ? 'Створити' : 'Зберегти'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
