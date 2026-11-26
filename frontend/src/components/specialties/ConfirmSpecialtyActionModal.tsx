import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import {
    deactivateSpecialty,
    deleteSpecialty,
    type SpecialtyItem,
} from '../../api/specialties';

interface ConfirmSpecialtyActionModalProps {
    show: boolean;
    action: 'deactivate' | 'delete';
    specialty: SpecialtyItem;
    onHide: () => void;
    onCompleted: (message: string) => Promise<void>;
}

export default function ConfirmSpecialtyActionModal({
    show,
    action,
    specialty,
    onHide,
    onCompleted,
}: ConfirmSpecialtyActionModalProps) {
    const [reason, setReason] = useState(specialty.deactivationReason ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setError(null);
        setSubmitting(true);
        try {
            if (action === 'deactivate') {
                await deactivateSpecialty(specialty.id, reason.trim() || null);
                await onCompleted(
                    `Спеціальність «${specialty.code} — ${specialty.name}» деактивовано.`,
                );
            } else {
                const msg = await deleteSpecialty(specialty.id);
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
                        ? 'Деактивація спеціальності'
                        : 'Видалення спеціальності'}
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
                        <p className="mb-3">
                            Деактивувати спеціальність{' '}
                            <strong>
                                {specialty.code} — {specialty.name}
                            </strong>{' '}
                            без призначення правонаступника?
                        </p>
                        <Alert variant="light" className="border py-2 small mb-3">
                            Після деактивації для цієї спеціальності не можна буде створювати нові
                            освітні програми, але всі існуючі програми та історичні дані збережуться.
                            Якщо це перекодування на новий код, краще скористатися дією{' '}
                            <strong>«Замінити»</strong>.
                        </Alert>
                        <Form.Group controlId="deactivate-specialty-reason">
                            <Form.Label>Причина деактивації (необовʼязково)</Form.Label>
                            <Form.Control
                                type="text"
                                maxLength={500}
                                placeholder="Наприклад: Припинення набору за спеціальністю"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={submitting}
                            />
                        </Form.Group>
                    </>
                ) : (
                    <>
                        <p className="mb-2">
                            Ви впевнені, що хочете назавжди видалити спеціальність{' '}
                            <strong>
                                {specialty.code} — {specialty.name}
                            </strong>
                            ?
                        </p>
                        <p className="text-muted small mb-0">
                            Цю дію неможливо скасувати. Видалення дозволене лише для спеціальностей
                            без освітніх програм і без посилань в історії замін.
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
