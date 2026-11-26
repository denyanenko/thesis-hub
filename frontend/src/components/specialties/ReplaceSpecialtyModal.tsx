import { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import {
    replaceSpecialty,
    type SpecialtyItem,
    type SpecialtyProgramsAction,
} from '../../api/specialties';
import { getSpecialtyCodeStyle } from './branchColors';

type TargetMode = 'create' | 'existing';

interface ReplaceSpecialtyModalProps {
    show: boolean;
    sourceSpecialty: SpecialtyItem;
    allSpecialties: SpecialtyItem[];
    onHide: () => void;
    onReplaced: (message: string) => Promise<void>;
}

const CODE_REGEX = /^[A-ZА-ЯІЇЄҐ0-9._-]+$/i;

export default function ReplaceSpecialtyModal({
    show,
    sourceSpecialty,
    allSpecialties,
    onHide,
    onReplaced,
}: ReplaceSpecialtyModalProps) {
    const activeCandidates = useMemo(
        () => allSpecialties.filter((s) => s.isActive && s.id !== sourceSpecialty.id),
        [allSpecialties, sourceSpecialty.id],
    );

    const [targetMode, setTargetMode] = useState<TargetMode>(
        activeCandidates.length > 0 ? 'existing' : 'create',
    );
    const [targetSearch, setTargetSearch] = useState('');
    const [selectedTargetId, setSelectedTargetId] = useState<number | ''>('');
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState(sourceSpecialty.name);
    const [programsAction, setProgramsAction] = useState<SpecialtyProgramsAction>(
        sourceSpecialty.counts.activePrograms > 0 ? 'clone' : 'keep',
    );
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filteredCandidates = useMemo(() => {
        const q = targetSearch.trim().toLowerCase();
        if (!q) return activeCandidates;
        return activeCandidates.filter(
            (s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
        );
    }, [activeCandidates, targetSearch]);

    const selectedTarget = useMemo(
        () =>
            typeof selectedTargetId === 'number'
                ? activeCandidates.find((s) => s.id === selectedTargetId) ?? null
                : null,
        [activeCandidates, selectedTargetId],
    );

    const previewTargetCode =
        targetMode === 'existing'
            ? (selectedTarget?.code ?? '')
            : newCode.trim().toUpperCase();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (targetMode === 'existing') {
            if (typeof selectedTargetId !== 'number') {
                setError('Оберіть активну спеціальність-правонаступника зі списку.');
                return;
            }
        } else {
            const normalizedCode = newCode.trim().toUpperCase();
            const trimmedName = newName.trim();
            if (!normalizedCode) {
                setError('Вкажіть код нової спеціальності.');
                return;
            }
            if (normalizedCode.length > 32 || !CODE_REGEX.test(normalizedCode)) {
                setError(
                    'Код може містити до 32 символів: літери, цифри, крапку, дефіс або підкреслення.',
                );
                return;
            }
            if (!trimmedName) {
                setError('Вкажіть назву нової спеціальності.');
                return;
            }
            if (trimmedName.length > 255) {
                setError('Назва не може перевищувати 255 символів.');
                return;
            }
        }

        setSubmitting(true);
        try {
            const result = await replaceSpecialty(sourceSpecialty.id, {
                ...(targetMode === 'existing'
                    ? { targetSpecialtyId: selectedTargetId as number }
                    : {
                          newCode: newCode.trim().toUpperCase(),
                          newName: newName.trim(),
                      }),
                programsAction,
                reason: reason.trim() || null,
            });

            const details: string[] = [];
            if (result.clonedProgramsCount > 0) {
                details.push(`клоновано ОП: ${result.clonedProgramsCount}`);
            }
            if (result.linkedExistingProgramsCount > 0) {
                details.push(`привʼязано до існуючих ОП: ${result.linkedExistingProgramsCount}`);
            }
            const suffix = details.length > 0 ? ` (${details.join(', ')})` : '';

            await onReplaced(
                `Спеціальність «${result.source.code}» замінено на «${result.target.code} — ${result.target.name}»${suffix}.`,
            );
            onHide();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не вдалося виконати заміну спеціальності');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={submitting ? undefined : onHide} centered size="lg">
            <Modal.Header closeButton={!submitting}>
                <Modal.Title className="h5">Заміна (перекодування) спеціальності</Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit} noValidate>
                <Modal.Body>
                    <div className="p-3 bg-light rounded border mb-3">
                        <div className="small text-muted mb-1">Попередній перегляд переходу:</div>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <span
                                className="badge font-monospace fs-6"
                                style={getSpecialtyCodeStyle(sourceSpecialty.code, false)}
                            >
                                {sourceSpecialty.code}
                            </span>
                            <span className="text-muted">{sourceSpecialty.name}</span>
                            <i className="bi bi-arrow-right text-primary fw-bold" />
                            <span
                                className="badge font-monospace fs-6"
                                style={getSpecialtyCodeStyle(
                                    previewTargetCode || '?',
                                    Boolean(previewTargetCode),
                                )}
                            >
                                {previewTargetCode || '…'}
                            </span>
                            {targetMode === 'existing' && selectedTarget && (
                                <span className="fw-medium">{selectedTarget.name}</span>
                            )}
                            {targetMode === 'create' && newName.trim() && (
                                <span className="fw-medium">{newName.trim()}</span>
                            )}
                        </div>
                        <div className="small text-muted mt-2">
                            Спеціальність <strong>{sourceSpecialty.code}</strong> буде деактивована
                            зі збереженням усіх історичних даних попередніх наборів та посиланням на
                            правонаступника.
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
                                id="replace-mode-existing"
                                name="replaceTargetMode"
                                label="Обрати існуючу активну спеціальність (перекодування або злиття)"
                                checked={targetMode === 'existing'}
                                onChange={() => setTargetMode('existing')}
                                disabled={submitting || activeCandidates.length === 0}
                            />
                            <Form.Check
                                type="radio"
                                id="replace-mode-create"
                                name="replaceTargetMode"
                                label="Створити нову спеціальність"
                                checked={targetMode === 'create'}
                                onChange={() => setTargetMode('create')}
                                disabled={submitting}
                            />
                        </div>
                    </Form.Group>

                    {targetMode === 'existing' ? (
                        <div className="mb-3">
                            <Form.Group className="mb-2" controlId="replace-target-search">
                                <Form.Control
                                    type="search"
                                    size="sm"
                                    placeholder="Швидкий пошук за кодом або назвою…"
                                    value={targetSearch}
                                    onChange={(e) => setTargetSearch(e.target.value)}
                                    disabled={submitting}
                                />
                            </Form.Group>
                            <Form.Group controlId="replace-target-select">
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
                                        — Оберіть активну спеціальність ({filteredCandidates.length}) —
                                    </option>
                                    {filteredCandidates.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.code} — {s.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </div>
                    ) : (
                        <div className="row g-3 mb-3">
                            <div className="col-sm-4">
                                <Form.Group controlId="replace-new-code">
                                    <Form.Label>Новий код</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Наприклад: F6"
                                        value={newCode}
                                        onChange={(e) => setNewCode(e.target.value)}
                                        disabled={submitting}
                                    />
                                </Form.Group>
                            </div>
                            <div className="col-sm-8">
                                <Form.Group controlId="replace-new-name">
                                    <Form.Label>Нова назва</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Назва нової спеціальності"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        disabled={submitting}
                                    />
                                </Form.Group>
                            </div>
                        </div>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-medium">
                            Дія з активними освітніми програмами ({sourceSpecialty.counts.activePrograms})
                        </Form.Label>
                        {sourceSpecialty.counts.activePrograms === 0 ? (
                            <div className="small text-muted">
                                Активних освітніх програм на цій спеціальності немає.
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-2">
                                <Form.Check
                                    type="radio"
                                    id="programs-action-clone"
                                    name="programsAction"
                                    checked={programsAction === 'clone'}
                                    onChange={() => setProgramsAction('clone')}
                                    disabled={submitting}
                                    label={
                                        <span>
                                            <strong>
                                                Клонувати під нову спеціальність із деактивацією
                                                старих ОП
                                            </strong>{' '}
                                            <span className="text-muted small">
                                                (рекомендовано: існуючі групи збережуть стару ОП і
                                                код {sourceSpecialty.code}, а нові набори йтимуть на
                                                правонаступника)
                                            </span>
                                        </span>
                                    }
                                />
                                <Form.Check
                                    type="radio"
                                    id="programs-action-keep"
                                    name="programsAction"
                                    checked={programsAction === 'keep'}
                                    onChange={() => setProgramsAction('keep')}
                                    disabled={submitting}
                                    label={
                                        <span>
                                            <strong>Залишити без змін</strong>{' '}
                                            <span className="text-muted small">
                                                (адміністратори зможуть створити нові ОП вручну
                                                пізніше)
                                            </span>
                                        </span>
                                    }
                                />
                            </div>
                        )}
                    </Form.Group>

                    <Form.Group controlId="replace-reason">
                        <Form.Label>Підстава / примітка (необовʼязково)</Form.Label>
                        <Form.Control
                            type="text"
                            maxLength={500}
                            placeholder="Наприклад: Постанова КМУ від 30.08.2024 № 1021"
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
