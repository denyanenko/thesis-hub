import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import {
    deactivateOrgUnit,
    deleteOrgUnit,
    type OrgUnitTreeItem,
} from '../../api/orgUnits';

interface ConfirmOrgActionModalProps {
    show: boolean;
    action: 'deactivate' | 'delete';
    unit: OrgUnitTreeItem;
    onHide: () => void;
    onConfirmed: (message: string, deletedId?: number) => Promise<void>;
}

export default function ConfirmOrgActionModal({
    show,
    action,
    unit,
    onHide,
    onConfirmed,
}: ConfirmOrgActionModalProps) {
    const [cascade, setCascade] = useState(unit.counts.activeChildren > 0);
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setServerError(null);
        setSubmitting(true);
        try {
            if (action === 'deactivate') {
                const { deactivatedIds } = await deactivateOrgUnit(unit.id, cascade);
                const msg =
                    deactivatedIds.length > 1
                        ? `Деактивовано підрозділ «${unit.name}» та дочірні підрозділи (усього: ${deactivatedIds.length}).`
                        : `Підрозділ «${unit.name}» деактивовано.`;
                await onConfirmed(msg);
            } else {
                const msg = await deleteOrgUnit(unit.id);
                await onConfirmed(msg, unit.id);
            }
            onHide();
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : 'Не вдалося виконати дію',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const isDelete = action === 'delete';

    return (
        <Modal show={show} onHide={submitting ? undefined : onHide} centered>
            <Modal.Header closeButton={!submitting}>
                <Modal.Title className="h5">
                    {isDelete ? 'Видалення підрозділу' : 'Деактивація підрозділу'}
                </Modal.Title>
            </Modal.Header>

            <Modal.Body>
                {serverError && (
                    <Alert variant="danger" className="py-2 small">
                        {serverError}
                    </Alert>
                )}

                {isDelete ? (
                    <p className="mb-0">
                        Ви впевнені, що хочете назавжди видалити підрозділ{' '}
                        <strong>«{unit.name}»</strong>? Цю дію неможливо скасувати.
                    </p>
                ) : (
                    <>
                        <p className="mb-3">
                            Підрозділ <strong>«{unit.name}»</strong> буде переведено в
                            неактивний стан. За потреби його можна буде активувати пізніше.
                        </p>

                        {unit.counts.activeChildren > 0 && (
                            <Alert variant="warning" className="py-2 small mb-0">
                                <div className="mb-2">
                                    У цього підрозділу є активні дочірні підрозділи (
                                    {unit.counts.activeChildren}).
                                </div>
                                <Form.Check
                                    type="checkbox"
                                    id="deactivate-cascade"
                                    label="Деактивувати разом з усіма активними дочірніми підрозділами"
                                    checked={cascade}
                                    disabled={submitting}
                                    onChange={(e) => {
                                        setServerError(null);
                                        setCascade(e.target.checked);
                                    }}
                                />
                            </Alert>
                        )}
                    </>
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
                    variant={isDelete ? 'danger' : 'warning'}
                    disabled={
                        submitting ||
                        (!isDelete && unit.counts.activeChildren > 0 && !cascade)
                    }
                    onClick={handleConfirm}
                >
                    {submitting ? (
                        <>
                            <Spinner size="sm" className="me-2" aria-hidden="true" />
                            Виконання…
                        </>
                    ) : isDelete ? (
                        'Видалити'
                    ) : (
                        'Деактивувати'
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
