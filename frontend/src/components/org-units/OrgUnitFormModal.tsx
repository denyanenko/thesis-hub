import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Spinner from 'react-bootstrap/Spinner';
import {
    ORG_UNIT_TYPE_LABELS,
    createOrgUnit,
    updateOrgUnit,
    type OrgUnitTreeItem,
    type OrgUnitType,
} from '../../api/orgUnits';

const ORG_UNIT_PLACEHOLDERS: Record<OrgUnitType, { name: string; shortName: string }> = {
    university: {
        name: 'Національний технічний університет України «Київський політехнічний інститут імені Ігоря Сікорського»',
        shortName: 'НТУУ КПІ',
    },
    institute: {
        name: 'Навчально-науковий фізико-технічний інститут',
        shortName: 'НН ФТІ',
    },
    faculty: {
        name: 'Факультет інформатики та обчислювальної техніки',
        shortName: 'ФІОТ',
    },
    department: {
        name: 'Кафедра інформаційних систем та технологій',
        shortName: 'ІСТ',
    },
};

interface OrgUnitFormValues {
    unitType: OrgUnitType;
    name: string;
    shortName: string;
}

interface OrgUnitFormModalProps {
    show: boolean;
    mode: 'create' | 'edit';
    parentUnit: OrgUnitTreeItem | null;
    editingUnit: OrgUnitTreeItem | null;
    allowedTypes: OrgUnitType[];
    canChangeType: boolean;
    onHide: () => void;
    onSaved: (savedId: number, message: string) => Promise<void>;
}

export default function OrgUnitFormModal({
    show,
    mode,
    parentUnit,
    editingUnit,
    allowedTypes,
    canChangeType,
    onHide,
    onSaved,
}: OrgUnitFormModalProps) {
    const defaultType =
        mode === 'edit' && editingUnit
            ? editingUnit.unitType
            : (allowedTypes[0] ?? 'university');

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<OrgUnitFormValues>({
        defaultValues: {
            unitType: defaultType,
            name: mode === 'edit' && editingUnit ? editingUnit.name : '',
            shortName: mode === 'edit' && editingUnit ? (editingUnit.shortName ?? '') : '',
        },
    });

    const [selectedType, setSelectedType] = useState<OrgUnitType>(defaultType);
    const [serverError, setServerError] = useState<string | null>(null);

    const placeholders = ORG_UNIT_PLACEHOLDERS[selectedType];

    const onSubmit = async (values: OrgUnitFormValues) => {
        setServerError(null);
        try {
            if (mode === 'create') {
                const created = await createOrgUnit({
                    parentId: parentUnit ? parentUnit.id : null,
                    unitType: values.unitType,
                    name: values.name.trim(),
                    shortName: values.shortName.trim() || null,
                });
                await onSaved(created.id, `Підрозділ «${values.name.trim()}» створено.`);
            } else if (editingUnit) {
                const payload = {
                    name: values.name.trim(),
                    shortName: values.shortName.trim() || null,
                    ...(canChangeType ? { unitType: values.unitType } : {}),
                };
                await updateOrgUnit(editingUnit.id, payload);
                await onSaved(
                    editingUnit.id,
                    `Підрозділ «${values.name.trim()}» оновлено.`,
                );
            }
            onHide();
        } catch (err) {
            setServerError(
                err instanceof Error ? err.message : 'Не вдалося зберегти підрозділ',
            );
        }
    };

    const typeOptions =
        mode === 'edit' && editingUnit && !allowedTypes.includes(editingUnit.unitType)
            ? [editingUnit.unitType, ...allowedTypes]
            : allowedTypes;

    return (
        <Modal show={show} onHide={isSubmitting ? undefined : onHide} centered>
            <Modal.Header closeButton={!isSubmitting}>
                <Modal.Title className="h5">
                    {mode === 'create'
                        ? parentUnit
                            ? 'Новий дочірній підрозділ'
                            : 'Новий кореневий підрозділ'
                        : 'Редагування підрозділу'}
                </Modal.Title>
            </Modal.Header>

            <Form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Modal.Body>
                    {mode === 'create' && (
                        <div className="small text-muted mb-3">
                            Батьківський підрозділ:{' '}
                            <strong className="text-dark">
                                {parentUnit ? parentUnit.name : 'Кореневий рівень'}
                            </strong>
                        </div>
                    )}

                    {serverError && (
                        <Alert variant="danger" className="py-2 small">
                            {serverError}
                        </Alert>
                    )}

                    <Form.Group className="mb-3" controlId="org-unit-type">
                        <Form.Label>Тип підрозділу</Form.Label>
                        <Form.Select
                            disabled={mode === 'edit' && !canChangeType}
                            isInvalid={!!errors.unitType}
                            {...register('unitType', {
                                required: 'Оберіть тип підрозділу',
                                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                                    setServerError(null);
                                    setSelectedType(e.target.value as OrgUnitType);
                                },
                            })}
                        >
                            {typeOptions.map((type) => (
                                <option key={type} value={type}>
                                    {ORG_UNIT_TYPE_LABELS[type]}
                                </option>
                            ))}
                        </Form.Select>
                        {mode === 'edit' && !canChangeType && (
                            <Form.Text className="text-muted">
                                Змінювати тип власного кореневого підрозділу може лише вищий
                                адміністратор.
                            </Form.Text>
                        )}
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="org-unit-name">
                        <Form.Label>Повна назва</Form.Label>
                        <Form.Control
                            type="text"
                            autoFocus
                            placeholder={`Наприклад, ${placeholders.name}`}
                            isInvalid={!!errors.name}
                            {...register('name', {
                                required: 'Введіть назву підрозділу',
                                validate: (v) =>
                                    v.trim().length > 0 || 'Назва не може бути порожньою',
                                maxLength: {
                                    value: 255,
                                    message: 'Максимум 255 символів',
                                },
                                onChange: () => setServerError(null),
                            })}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.name?.message}
                        </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group controlId="org-unit-short-name">
                        <Form.Label>Скорочена назва (необовʼязково)</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder={`Наприклад, ${placeholders.shortName}`}
                            isInvalid={!!errors.shortName}
                            {...register('shortName', {
                                maxLength: {
                                    value: 64,
                                    message: 'Максимум 64 символи',
                                },
                                onChange: () => setServerError(null),
                            })}
                        />
                        <Form.Control.Feedback type="invalid">
                            {errors.shortName?.message}
                        </Form.Control.Feedback>
                    </Form.Group>
                </Modal.Body>

                <Modal.Footer>
                    <Button
                        variant="outline-secondary"
                        onClick={onHide}
                        disabled={isSubmitting}
                    >
                        Скасувати
                    </Button>
                    <Button type="submit" variant="primary" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Spinner size="sm" className="me-2" aria-hidden="true" />
                                Збереження…
                            </>
                        ) : mode === 'create' ? (
                            'Створити'
                        ) : (
                            'Зберегти'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
