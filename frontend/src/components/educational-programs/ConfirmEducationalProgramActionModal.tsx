import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import {
    DEGREE_LEVEL_LABELS,
    deactivateEducationalProgram,
    deleteEducationalProgram,
    type EducationalProgramItem,
} from '../../api/educationalPrograms';

interface ConfirmEducationalProgramActionModalProps {
    show: boolean;
    action: 'deactivate' | 'delete';
    program: EducationalProgramItem;
    onHide: () => void;
    onCompleted: (message: string) => Promise<void>;
}

export default function ConfirmEducationalProgramActionModal({
    show,
    action,
    program,
    onHide,
    onCompleted,
}: ConfirmEducationalProgramActionModalProps) {
    const [reason, setReason] = useState(program.deactivationReason ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setError(null);
        setSubmitting(true);
        try {
            if (action === 'deactivate') {
                await deactivateEducationalProgram(program.id, reason.trim() || null);
                await onCompleted(`Освітню програму «${program.name}» деактивовано.`);
            } else {
                const msg = await deleteEducationalProgram(program.id);
                await onCompleted(msg);
            }
            onHide();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Операція завершилася помилкою');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={submitting ? undefined : onHide} centered>
            <Modal.Header closeButton={!submitting}>
                <Modal.Title className="h5">
                    {action === 'deactivate'
                        ? 'Деактивація освітньої програми'
                        : 'Видалення освітньої програми'}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {error && (
                    <Alert variant="danger" className="py-2 small">
                        {error}
                    </Alert>
                )}

                {action === 'deactivate' ? (
                    <>
                        <p className="mb-2">
                            Деактивувати освітню програму <strong>{program.name}</strong> (
                            {program.specialty.code}, {DEGREE_LEVEL_LABELS[program.degreeLevel]})
                            без призначення правонаступника?
                        </p>
                        <Alert variant="light" className="border py-2 small mb-3">
                            Існуючі групи збережуть привʼязку до цієї ОП, але нові набори на неї не
                            створюватимуться. Якщо ОП перейменовано або обʼєднано з іншою — краще
                            скористатися дією <strong>«Замінити»</strong>.
                        </Alert>
                        <Form.Group controlId="deactivate-ep-reason">
                            <Form.Label>Причина деактивації (необовʼязково)</Form.Label>
                            <Form.Control
                                type="text"
                                maxLength={500}
                                placeholder="Наприклад: Припинення набору на програму"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={submitting}
                            />
                        </Form.Group>
                    </>
                ) : (
                    <>
                        <p className="mb-2">
                            Ви впевнені, що хочете назавжди видалити освітню програму{' '}
                            <strong>{program.name}</strong> ({program.specialty.code},{' '}
                            {DEGREE_LEVEL_LABELS[program.degreeLevel]})?
                        </p>
                        <p className="text-muted small mb-0">
                            Цю дію неможливо скасувати. Видалення дозволене лише для ОП без
                            академічних груп та без посилань в історії замін.
                        </p>
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="outline-secondary" onClick={onHide} disabled={submitting}>
                    Скасувати
                </Button>
                <Button
                    variant={action === 'delete' ? 'danger' : 'warning'}
                    onClick={handleConfirm}
                    disabled={submitting}
                >
                    {submitting && <Spinner size="sm" className="me-2" aria-hidden="true" />}
                    {action === 'deactivate' ? 'Деактивувати' : 'Видалити'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
