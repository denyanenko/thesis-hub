import { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import {
    DEGREE_LEVELS,
    DEGREE_LEVEL_LABELS,
    DEGREE_LEVEL_SHORT_LABELS,
    replaceEducationalProgram,
    type DegreeLevel,
    type EducationalProgramItem,
    type ProgramDepartmentRef,
    type ProgramSpecialtyRef,
} from '../../api/educationalPrograms';
import { getSpecialtyCodeStyle } from '../specialties/branchColors';

type TargetMode = 'create' | 'existing';

interface ReplaceEducationalProgramModalProps {
    show: boolean;
    sourceProgram: EducationalProgramItem;
    allPrograms: EducationalProgramItem[];
    availableDepartments: ProgramDepartmentRef[];
    activeSpecialties: ProgramSpecialtyRef[];
    onHide: () => void;
    onReplaced: (message: string) => Promise<void>;
}

export default function ReplaceEducationalProgramModal({
    show,
    sourceProgram,
    allPrograms,
    availableDepartments,
    activeSpecialties,
    onHide,
    onReplaced,
}: ReplaceEducationalProgramModalProps) {
    const activeDepartments = useMemo(
        () => availableDepartments.filter((d) => d.isActive),
        [availableDepartments],
    );

    const activeCandidates = useMemo(
        () => allPrograms.filter((p) => p.isActive && p.id !== sourceProgram.id),
        [allPrograms, sourceProgram.id],
    );

    const [targetMode, setTargetMode] = useState<TargetMode>('create');
    const [targetSearch, setTargetSearch] = useState('');
    const [selectedTargetId, setSelectedTargetId] = useState<number | ''>('');

    const [newName, setNewName] = useState(sourceProgram.name);
    const [newSpecialtyId, setNewSpecialtyId] = useState<number | ''>(
        activeSpecialties.some((s) => s.id === sourceProgram.specialtyId)
            ? sourceProgram.specialtyId
            : '',
    );
    const [specialtySearch, setSpecialtySearch] = useState('');
    const [newOrgUnitId, setNewOrgUnitId] = useState<number | ''>(
        activeDepartments.some((d) => d.id === sourceProgram.orgUnitId)
            ? sourceProgram.orgUnitId
            : activeDepartments.length === 1
              ? activeDepartments[0].id
              : '',
    );
    const [newDegreeLevel, setNewDegreeLevel] = useState<DegreeLevel>(
        sourceProgram.degreeLevel,
    );
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filteredCandidates = useMemo(() => {
        const q = targetSearch.trim().toLowerCase();
        if (!q) return activeCandidates;
        return activeCandidates.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                p.specialty.code.toLowerCase().includes(q) ||
                (p.department.shortName ?? '').toLowerCase().includes(q) ||
                p.department.name.toLowerCase().includes(q),
        );
    }, [activeCandidates, targetSearch]);

    const filteredSpecialties = useMemo(() => {
        const q = specialtySearch.trim().toLowerCase();
        if (!q) return activeSpecialties;
        return activeSpecialties.filter(
            (s) =>
                s.id === newSpecialtyId ||
                s.code.toLowerCase().includes(q) ||
                s.name.toLowerCase().includes(q),
        );
    }, [activeSpecialties, specialtySearch, newSpecialtyId]);

    const selectedTarget = useMemo(
        () =>
            typeof selectedTargetId === 'number'
                ? activeCandidates.find((p) => p.id === selectedTargetId) ?? null
                : null,
        [activeCandidates, selectedTargetId],
    );

    const selectedNewSpecialty = useMemo(
        () =>
            typeof newSpecialtyId === 'number'
                ? activeSpecialties.find((s) => s.id === newSpecialtyId) ?? null
                : null,
        [activeSpecialties, newSpecialtyId],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (targetMode === 'existing') {
            if (typeof selectedTargetId !== 'number') {
                setError('Оберіть активну освітню програму-правонаступника.');
                return;
            }
        } else {
            const trimmedName = newName.trim();
            if (!trimmedName) {
                setError('Вкажіть назву нової освітньої програми.');
                return;
            }
            if (typeof newSpecialtyId !== 'number') {
                setError('Оберіть активну спеціальність для нової ОП.');
                return;
            }
            if (typeof newOrgUnitId !== 'number') {
                setError('Оберіть активну кафедру для нової ОП.');
                return;
            }
            if (
                trimmedName === sourceProgram.name &&
                newSpecialtyId === sourceProgram.specialtyId &&
                newOrgUnitId === sourceProgram.orgUnitId &&
                newDegreeLevel === sourceProgram.degreeLevel
            ) {
                setError(
                    'Нова ОП повинна відрізнятися від поточної хоча б назвою, спеціальністю, кафедрою або рівнем освіти.',
                );
                return;
            }
        }

        setSubmitting(true);
        try {
            const result = await replaceEducationalProgram(
                sourceProgram.id,
                targetMode === 'existing'
                    ? {
                          targetProgramId: selectedTargetId as number,
                          reason: reason.trim() || null,
                      }
                    : {
                          newName: newName.trim(),
                          newSpecialtyId: newSpecialtyId as number,
                          newOrgUnitId: newOrgUnitId as number,
                          newDegreeLevel,
                          reason: reason.trim() || null,
                      },
            );

            await onReplaced(
                `Освітню програму «${result.source.name}» замінено на «${result.target.specialtyCode} · ${result.target.name}».`,
            );
            onHide();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Не вдалося виконати заміну освітньої програми',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const previewTargetSpecCode =
        targetMode === 'existing'
            ? (selectedTarget?.specialty.code ?? '')
            : (selectedNewSpecialty?.code ?? '');
    const previewTargetName =
        targetMode === 'existing'
            ? (selectedTarget?.name ?? '…')
            : newName.trim() || '…';

    return (
        <Modal show={show} onHide={submitting ? undefined : onHide} centered size="lg">
            <Modal.Header closeButton={!submitting}>
                <Modal.Title className="h5">
                    Заміна (перейменування / обʼєднання) освітньої програми
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit} noValidate>
                <Modal.Body>
                    <div className="p-3 bg-light rounded border mb-3">
                        <div className="small text-muted mb-1">Попередній перегляд переходу:</div>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <span
                                className="badge font-monospace"
                                style={getSpecialtyCodeStyle(sourceProgram.specialty.code, false)}
                            >
                                {sourceProgram.specialty.code}
                            </span>
                            <span className="text-muted">
                                {sourceProgram.name} (
                                {DEGREE_LEVEL_SHORT_LABELS[sourceProgram.degreeLevel]})
                            </span>
                            <i className="bi bi-arrow-right text-primary fw-bold" />
                            {previewTargetSpecCode && (
                                <span
                                    className="badge font-monospace"
                                    style={getSpecialtyCodeStyle(previewTargetSpecCode, true)}
                                >
                                    {previewTargetSpecCode}
                                </span>
                            )}
                            <span className="fw-medium">{previewTargetName}</span>
                        </div>
                        <div className="small text-muted mt-2">
                            Поточна ОП буде деактивована із посиланням на правонаступника. Існуючі
                            групи ({sourceProgram.counts.groups}) залишаться на старій ОП для
                            збереження історії попередніх наборів.
                        </div>
                    </div>

                    {error && (
                        <Alert variant="danger" className="py-2 small">
                            {error}
                        </Alert>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-medium">Правонаступник</Form.Label>
                        <div className="d-flex flex-wrap gap-3">
                            <Form.Check
                                type="radio"
                                id="ep-replace-create"
                                name="epReplaceMode"
                                label="Створити нову ОП-правонаступника (перейменування / оновлення)"
                                checked={targetMode === 'create'}
                                onChange={() => setTargetMode('create')}
                                disabled={submitting}
                            />
                            <Form.Check
                                type="radio"
                                id="ep-replace-existing"
                                name="epReplaceMode"
                                label="Обрати існуючу активну ОП (обʼєднання)"
                                checked={targetMode === 'existing'}
                                onChange={() => setTargetMode('existing')}
                                disabled={submitting || activeCandidates.length === 0}
                            />
                        </div>
                    </Form.Group>

                    {targetMode === 'existing' ? (
                        <div className="mb-3">
                            <Form.Control
                                type="search"
                                size="sm"
                                className="mb-2"
                                placeholder="Пошук активної ОП за назвою, спеціальністю або кафедрою…"
                                value={targetSearch}
                                onChange={(e) => setTargetSearch(e.target.value)}
                                disabled={submitting}
                            />
                            <Form.Select
                                value={selectedTargetId}
                                onChange={(e) =>
                                    setSelectedTargetId(
                                        e.target.value ? Number(e.target.value) : '',
                                    )
                                }
                                disabled={submitting}
                            >
                                <option value="">
                                    — Оберіть активну ОП ({filteredCandidates.length}) —
                                </option>
                                {filteredCandidates.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        [{p.specialty.code}] {p.name} (
                                        {DEGREE_LEVEL_SHORT_LABELS[p.degreeLevel]},{' '}
                                        {p.department.shortName ?? p.department.name})
                                    </option>
                                ))}
                            </Form.Select>
                        </div>
                    ) : (
                        <div className="mb-3">
                            <Form.Group className="mb-3" controlId="ep-replace-new-name">
                                <Form.Label>Назва нової ОП</Form.Label>
                                <Form.Control
                                    type="text"
                                    maxLength={255}
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    disabled={submitting}
                                />
                            </Form.Group>

                            <div className="row g-3 mb-3">
                                <div className="col-md-7">
                                    <Form.Group controlId="ep-replace-new-specialty">
                                        <Form.Label>Спеціальність</Form.Label>
                                        <Form.Control
                                            type="search"
                                            size="sm"
                                            className="mb-2"
                                            placeholder="Пошук спеціальності…"
                                            value={specialtySearch}
                                            onChange={(e) => setSpecialtySearch(e.target.value)}
                                            disabled={submitting}
                                        />
                                        <Form.Select
                                            value={newSpecialtyId}
                                            onChange={(e) =>
                                                setNewSpecialtyId(
                                                    e.target.value ? Number(e.target.value) : '',
                                                )
                                            }
                                            disabled={submitting}
                                        >
                                            <option value="">— Оберіть активну спеціальність —</option>
                                            {filteredSpecialties.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.code} — {s.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </div>

                                <div className="col-md-5">
                                    <Form.Group controlId="ep-replace-new-degree">
                                        <Form.Label>Рівень освіти</Form.Label>
                                        <Form.Select
                                            value={newDegreeLevel}
                                            onChange={(e) =>
                                                setNewDegreeLevel(e.target.value as DegreeLevel)
                                            }
                                            disabled={submitting}
                                        >
                                            {DEGREE_LEVELS.map((level) => (
                                                <option key={level} value={level}>
                                                    {DEGREE_LEVEL_LABELS[level]}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </div>
                            </div>

                            <Form.Group controlId="ep-replace-new-dept">
                                <Form.Label>Випускова кафедра</Form.Label>
                                <Form.Select
                                    value={newOrgUnitId}
                                    onChange={(e) =>
                                        setNewOrgUnitId(
                                            e.target.value ? Number(e.target.value) : '',
                                        )
                                    }
                                    disabled={submitting}
                                >
                                    <option value="">— Оберіть активну кафедру —</option>
                                    {activeDepartments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.parentShortName ? `[${dept.parentShortName}] ` : ''}
                                            {dept.shortName ? `${dept.shortName} — ` : ''}
                                            {dept.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </div>
                    )}

                    <Form.Group controlId="ep-replace-reason">
                        <Form.Label>Підстава / примітка (необовʼязково)</Form.Label>
                        <Form.Control
                            type="text"
                            maxLength={500}
                            placeholder="Наприклад: Оновлення редакції ОП рішенням Вченої ради 2026"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={submitting}
                        />
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={onHide} disabled={submitting}>
                        Скасувати
                    </Button>
                    <Button variant="primary" type="submit" disabled={submitting}>
                        {submitting && <Spinner size="sm" className="me-2" aria-hidden="true" />}
                        Виконати заміну
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
