import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import { DEGREE_LEVEL_SHORT_LABELS } from '../../api/educationalPrograms';
import { deactivateGroup, deleteGroup, type GroupItem } from '../../api/groups';

interface ConfirmGroupActionModalProps {
    show: boolean;
    action: 'deactivate' | 'delete';
    group: GroupItem;
    onHide: () => void;
    onCompleted: (message: string) => Promise<void>;
}

export default function ConfirmGroupActionModal({
    show,
    action,
    group,
    onHide,
    onCompleted,
}: ConfirmGroupActionModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setError(null);
        setSubmitting(true);
        try {
            if (action === 'deactivate') {
                await deactivateGroup(group.id);
                await onCompleted(`Групу «${group.name}» переведено в архів.`);
            } else {
                const msg = await deleteGroup(group.id);
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
                        ? 'Переведення групи в архів'
                        : 'Видалення академічної групи'}
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
                            Перевести академічну групу <strong>{group.name}</strong> (ОП «
                            {group.program.name}», {group.program.specialty.code},{' '}
                            {DEGREE_LEVEL_SHORT_LABELS[group.program.degreeLevel]}) в архів?
                        </p>
                        <Alert variant="light" className="border py-2 small mb-0">
                            Архівна (випущена) група приховується зі списку активних груп, але
                            повністю зберігає історію студентів та кваліфікаційних робіт. За
                            потреби її можна повторно активувати.
                        </Alert>
                    </>
                ) : (
                    <>
                        <p className="mb-2">
                            Ви впевнені, що хочете назавжди видалити академічну групу{' '}
                            <strong>{group.name}</strong>?
                        </p>
                        <p className="text-muted small mb-0">
                            Цю дію неможливо скасувати. Видалення дозволене лише для порожніх груп
                            без привʼязаних студентів.
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
                    {action === 'deactivate' ? 'Перевести в архів' : 'Видалити'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
