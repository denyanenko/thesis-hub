import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import {
    createSpecialty,
    updateSpecialty,
    type SpecialtyItem,
} from '../../api/specialties';

interface SpecialtyFormValues {
    code: string;
    name: string;
}

interface SpecialtyFormModalProps {
    show: boolean;
    mode: 'create' | 'edit';
    editingSpecialty: SpecialtyItem | null;
    onHide: () => void;
    onSaved: (message: string) => Promise<void>;
}

const CODE_REGEX = /^[A-ZА-ЯІЇЄҐ0-9._-]+$/i;

export default function SpecialtyFormModal({
    show,
    mode,
    editingSpecialty,
    onHide,
    onSaved,
}: SpecialtyFormModalProps) {
    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isSubmitting },
    } = useForm<SpecialtyFormValues>({
        defaultValues: {
            code: mode === 'edit' && editingSpecialty ? editingSpecialty.code : '',
            name: mode === 'edit' && editingSpecialty ? editingSpecialty.name : '',
        },
    });

    const watchedCode = useWatch({ control, name: 'code' });
    const [serverError, setServerError] = useState<string | null>(null);

    const isChangingCodeWithHistory =
        mode === 'edit' &&
        editingSpecialty !== null &&
        editingSpecialty.counts.programs > 0 &&
        watchedCode.trim().toUpperCase() !== editingSpecialty.code;

    const onSubmit = async (values: SpecialtyFormValues) => {
        setServerError(null);
        const normalizedCode = values.code.trim().toUpperCase();
        const trimmedName = values.name.trim();

        try {
            if (mode === 'create') {
                await createSpecialty({
                    code: normalizedCode,
                    name: trimmedName,
                });
                await onSaved(`Спеціальність «${normalizedCode} — ${trimmedName}» створено.`);
            } else if (editingSpecialty) {
                await updateSpecialty(editingSpecialty.id, {
                    code: normalizedCode,
                    name: trimmedName,
                });
                await onSaved(`Спеціальність «${normalizedCode} — ${trimmedName}» оновлено.`);
            }
            onHide();
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : 'Не вдалося зберегти спеціальність',
            );
        }
    };

    return (
        <Modal show={show} onHide={isSubmitting ? undefined : onHide} centered>
            <Modal.Header closeButton={!isSubmitting}>
                <Modal.Title className="h5">
                    {mode === 'create' ? 'Нова спеціальність' : 'Редагування спеціальності'}
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Modal.Body>
                    {serverError && (
                        <Alert variant="danger" className="py-2 small">
                            {serverError}
                        </Alert>
                    )}

                    {mode === 'edit' && (
                        <Alert variant="light" className="border py-2 small mb-3">
                            Редагування на місці призначене для виправлення одруківок і редакційних
                            уточнень. Для перекодування (напр. <code>126 → F6</code>) скористайтеся
                            дією <strong>«Замінити»</strong>, щоб зберегти історію попередніх наборів.
                        </Alert>
                    )}

                    <Form.Group className="mb-3" controlId="specialty-code">
                        <Form.Label>Код спеціальності</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Наприклад: F6 або 126"
                            disabled={isSubmitting}
                            isInvalid={!!errors.code}
                            autoFocus
                            {...register('code', {
                                validate: (v) => {
                                    const trimmed = v.trim();
                                    if (!trimmed) return 'Код спеціальності є обовʼязковим';
                                    if (trimmed.length > 32)
                                        return 'Код не може перевищувати 32 символи';
                                    if (!CODE_REGEX.test(trimmed)) {
                                        return 'Допустимі лише літери, цифри, крапка, дефіс або підкреслення';
                                    }
                                    return true;
                                },
                            })}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.code?.message}
                        </Form.Control.Feedback>
                        <Form.Text className="text-muted">
                            Літери автоматично приводяться до верхнього регістру.
                        </Form.Text>
                    </Form.Group>

                    {isChangingCodeWithHistory && (
                        <Alert variant="warning" className="py-2 small mb-3">
                            <i className="bi bi-exclamation-triangle me-1" />
                            До цієї спеціальності привʼязано освітні програми (
                            {editingSpecialty.counts.programs}). Зміна коду на місці перезапише його
                            для всіх повʼязаних програм. Якщо це офіційне перекодування — краще
                            скасувати та виконати <strong>Заміну</strong>.
                        </Alert>
                    )}

                    <Form.Group controlId="specialty-name">
                        <Form.Label>Назва спеціальності</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Наприклад: Інформаційні системи і технології"
                            disabled={isSubmitting}
                            isInvalid={!!errors.name}
                            {...register('name', {
                                validate: (v) => {
                                    const trimmed = v.trim();
                                    if (!trimmed) return 'Назва спеціальності є обовʼязковою';
                                    if (trimmed.length > 255) {
                                        return 'Назва не може перевищувати 255 символів';
                                    }
                                    return true;
                                },
                            })}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.name?.message}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={onHide} disabled={isSubmitting}>
                        Скасувати
                    </Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Spinner size="sm" className="me-2" aria-hidden="true" />}
                        {mode === 'create' ? 'Створити' : 'Зберегти'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
