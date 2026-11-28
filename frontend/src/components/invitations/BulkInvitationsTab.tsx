import { useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Spinner from 'react-bootstrap/Spinner';
import Table from 'react-bootstrap/Table';
import type { UserRole } from '../../api/auth';
import {
    createBulkInvitations,
    downloadInvitationTemplate,
    previewBulkInvitations,
    uploadBulkInvitationsFile,
    type BulkCreateResponse,
    type BulkInvitationRowInput,
    type BulkPreviewRow,
    type InvitationCatalog,
} from '../../api/invitations';
import {
    DEGREE_LEVEL_LABELS,
    SUPERADMIN_LABEL,
    USER_ROLE_PLURAL_LABELS,
} from './invitationLabels';

interface BulkInvitationsTabProps {
    catalog: InvitationCatalog | undefined;
    onBulkCreated: (result: BulkCreateResponse) => void;
}

interface EditableRow {
    localId: string;
    rowNumber: number;
    email: string;
    lastName: string;
    firstName: string;
    patronymic: string;
    studentNumber: string;
    groupId: number | null;
    groupRef: string;
    orgUnitId: number | null;
    orgUnitRef: string;
    position: string;
    academicDegree: string;
    academicTitle: string;
    validated: boolean;
    isValid: boolean;
    errors: string[];
}

const ROLES: UserRole[] = ['student', 'supervisor', 'admin'];
const SUPERADMIN_SELECT_VALUE = '__superadmin__';

let localRowCounter = 1;
function nextLocalId(): string {
    localRowCounter += 1;
    return `row-${localRowCounter}`;
}

function createEmptyRow(rowNumber: number): EditableRow {
    return {
        localId: nextLocalId(),
        rowNumber,
        email: '',
        lastName: '',
        firstName: '',
        patronymic: '',
        studentNumber: '',
        groupId: null,
        groupRef: '',
        orgUnitId: null,
        orgUnitRef: '',
        position: '',
        academicDegree: '',
        academicTitle: '',
        validated: false,
        isValid: false,
        errors: [],
    };
}

function fromPreviewRow(row: BulkPreviewRow): EditableRow {
    return {
        localId: nextLocalId(),
        rowNumber: row.rowNumber,
        email: row.email,
        lastName: row.lastName,
        firstName: row.firstName,
        patronymic: row.patronymic ?? '',
        studentNumber: row.studentNumber ?? '',
        groupId: row.groupId,
        groupRef: row.groupRef ?? '',
        orgUnitId: row.orgUnitId,
        orgUnitRef: row.orgUnitRef ?? '',
        position: row.position ?? '',
        academicDegree: row.academicDegree ?? '',
        academicTitle: row.academicTitle ?? '',
        validated: true,
        isValid: row.isValid,
        errors: row.errors,
    };
}

function toApiRowInput(
    row: EditableRow,
    role: UserRole,
): BulkInvitationRowInput {
    return {
        rowNumber: row.rowNumber,
        email: row.email.trim(),
        lastName: row.lastName.trim(),
        firstName: row.firstName.trim(),
        patronymic: row.patronymic.trim() || null,
        studentNumber:
            role === 'student' ? row.studentNumber.trim() || null : null,
        groupId: role === 'student' ? row.groupId : null,
        groupRef:
            role === 'student' && row.groupId === null
                ? row.groupRef.trim() || null
                : null,
        orgUnitId: role !== 'student' ? row.orgUnitId : null,
        orgUnitRef:
            role !== 'student' && row.orgUnitId === null
                ? row.orgUnitRef.trim() || null
                : null,
        position: role !== 'student' ? row.position.trim() || null : null,
        academicDegree:
            role === 'supervisor' ? row.academicDegree.trim() || null : null,
        academicTitle:
            role === 'supervisor' ? row.academicTitle.trim() || null : null,
    };
}

function parsePastedTsv(text: string, role: UserRole): EditableRow[] {
    const lines = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((line) => line.split('\t').map((cell) => cell.trim()))
        .filter((cells) => cells.some((c) => c.length > 0));

    if (lines.length === 0) return [];

    // Пропускаємо рядок заголовків, якщо користувач скопіював його разом із даними
    const firstCell = (lines[0][0] ?? '').toLowerCase().replaceAll('*', '').trim();
    const startIdx =
        firstCell === 'email' ||
        firstCell === 'e-mail' ||
        firstCell === 'пошта' ||
        firstCell === 'електронна пошта'
            ? 1
            : 0;

    return lines.slice(startIdx).map((cells, idx) => {
        const base = createEmptyRow(idx + 1);
        base.email = cells[0] ?? '';
        base.lastName = cells[1] ?? '';
        base.firstName = cells[2] ?? '';
        base.patronymic = cells[3] ?? '';

        if (role === 'student') {
            base.studentNumber = cells[4] ?? '';
            base.groupRef = cells[5] ?? '';
        } else if (role === 'supervisor') {
            base.orgUnitRef = cells[4] ?? '';
            base.position = cells[5] ?? '';
            base.academicDegree = cells[6] ?? '';
            base.academicTitle = cells[7] ?? '';
        } else {
            base.orgUnitRef = cells[4] ?? '';
            base.position = cells[5] ?? '';
        }
        return base;
    });
}

export default function BulkInvitationsTab({
    catalog,
    onBulkCreated,
}: BulkInvitationsTabProps) {
    const [role, setRole] = useState<UserRole>('student');
    const [rows, setRows] = useState<EditableRow[]>([createEmptyRow(1)]);
    const [isDragging, setIsDragging] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [validating, setValidating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoBanner, setInfoBanner] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handleRoleChange = (nextRole: UserRole) => {
        if (nextRole === role) return;
        setRole(nextRole);
        setRows([createEmptyRow(1)]);
        setError(null);
        setInfoBanner(null);
    };

    const handleDownloadTemplate = async () => {
        setDownloading(true);
        setError(null);
        try {
            await downloadInvitationTemplate(role);
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося завантажити шаблон Excel',
            );
        } finally {
            setDownloading(false);
        }
    };

    const runServerPreview = async (
        targetRole: UserRole,
        currentRows: EditableRow[],
    ) => {
        const nonEmpty = currentRows.filter(
            (r) =>
                r.email.trim() ||
                r.lastName.trim() ||
                r.firstName.trim() ||
                r.studentNumber.trim() ||
                r.groupId !== null ||
                r.groupRef.trim() ||
                r.orgUnitId !== null ||
                r.orgUnitRef.trim(),
        );

        if (nonEmpty.length === 0) {
            setError('Заповніть щонайменше один рядок перед перевіркою.');
            return null;
        }

        setValidating(true);
        setError(null);
        try {
            const payload = nonEmpty.map((r, idx) =>
                toApiRowInput({ ...r, rowNumber: idx + 1 }, targetRole),
            );
            const preview = await previewBulkInvitations(targetRole, payload);
            const mapped = preview.rows.map(fromPreviewRow);
            setRows(mapped);
            return preview;
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося перевірити список рядків',
            );
            return null;
        } finally {
            setValidating(false);
        }
    };

    const handleFileSelected = async (file: File | null | undefined) => {
        if (!file) return;
        setUploading(true);
        setError(null);
        setInfoBanner(null);
        try {
            const preview = await uploadBulkInvitationsFile(role, file);
            setRows(preview.rows.map(fromPreviewRow));
            setInfoBanner(
                `Файл «${file.name}» оброблено: знайдено ${preview.totalCount} рядків (готові: ${preview.validCount}, з помилками: ${preview.invalidCount}).`,
            );
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося обробити файл',
            );
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        void handleFileSelected(e.target.files?.[0]);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        void handleFileSelected(e.dataTransfer.files?.[0]);
    };

    const handleTablePaste = (e: ClipboardEvent<HTMLDivElement>) => {
        const text = e.clipboardData.getData('text/plain');
        if (!text.includes('\t') && !text.includes('\n')) {
            return; // звичайна вставка в одне поле
        }
        const parsed = parsePastedTsv(text, role);
        if (parsed.length === 0) return;

        e.preventDefault();
        setError(null);

        const existingNonEmpty = rows.filter(
            (r) => r.email.trim() || r.lastName.trim() || r.firstName.trim(),
        );
        const combined = [...existingNonEmpty, ...parsed].map((r, idx) => ({
            ...r,
            rowNumber: idx + 1,
        }));
        setRows(combined);
        setInfoBanner(
            `Вставлено ${parsed.length} рядків із буфера обміну. Виконується перевірка…`,
        );
        void runServerPreview(role, combined);
    };

    const updateRow = (
        localId: string,
        patch: Partial<EditableRow>,
    ) => {
        setRows((prev) =>
            prev.map((row) =>
                row.localId === localId
                    ? {
                          ...row,
                          ...patch,
                          validated: false,
                          isValid: false,
                          errors: [],
                      }
                    : row,
            ),
        );
    };

    const addRows = (count: number) => {
        setRows((prev) => {
            const added = Array.from({ length: count }, (_, idx) =>
                createEmptyRow(prev.length + idx + 1),
            );
            return [...prev, ...added];
        });
    };

    const removeRow = (localId: string) => {
        setRows((prev) => {
            const next = prev.filter((r) => r.localId !== localId);
            return next.length > 0
                ? next.map((r, idx) => ({ ...r, rowNumber: idx + 1 }))
                : [createEmptyRow(1)];
        });
    };

    const removeInvalidRows = () => {
        setRows((prev) => {
            const validOnly = prev.filter((r) => r.validated && r.isValid);
            return validOnly.length > 0
                ? validOnly.map((r, idx) => ({ ...r, rowNumber: idx + 1 }))
                : [createEmptyRow(1)];
        });
    };

    const handleSubmitBulk = async () => {
        setError(null);
        setInfoBanner(null);

        // Спочатку актуалізуємо валідацію, якщо користувач редагував рядки після останньої перевірки
        const hasUnvalidated = rows.some((r) => !r.validated);
        let rowsToSend = rows;

        if (hasUnvalidated) {
            const preview = await runServerPreview(role, rows);
            if (!preview) return;
            rowsToSend = preview.rows.map(fromPreviewRow);
            if (preview.validCount === 0) {
                setError(
                    'Жоден рядок не готовий до відправки. Виправте виділені помилки в таблиці.',
                );
                return;
            }
            if (preview.invalidCount > 0) {
                setInfoBanner(
                    `Перевірку завершено: готові ${preview.validCount} із ${preview.totalCount}. Виправте помилки або натисніть «Надіслати лише валідні (${preview.validCount})».`,
                );
                return;
            }
        }

        const validCountNow = rowsToSend.filter(
            (r) => r.validated && r.isValid,
        ).length;
        if (validCountNow === 0) {
            setError('Немає валідних рядків для відправки.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = rowsToSend.map((r, idx) =>
                toApiRowInput({ ...r, rowNumber: idx + 1 }, role),
            );
            const result = await createBulkInvitations(role, payload, true);
            onBulkCreated(result);

            if (result.skipped.length > 0) {
                setRows(result.skipped.map(fromPreviewRow));
                setInfoBanner(
                    `Надіслано ${result.createdCount} запрошень. У таблиці залишилося ${result.skippedCount} рядків із помилками — ви можете виправити їх і довідправити.`,
                );
            } else {
                setRows([createEmptyRow(1)]);
                setInfoBanner(null);
            }
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Не вдалося надіслати масові запрошення',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const totalCount = rows.length;
    const validCount = rows.filter((r) => r.validated && r.isValid).length;
    const invalidCount = rows.filter((r) => r.validated && !r.isValid).length;
    const unvalidatedCount = rows.filter((r) => !r.validated).length;

    const busy = uploading || validating || submitting;

    return (
        <div className="d-flex flex-column gap-3">
            {/* Крок 1: Роль + Завантаження шаблону та файлу */}
            <Card className="border-0 shadow-sm">
                <Card.Body>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                        <div>
                            <div className="small text-muted mb-1">
                                1. Оберіть роль користувачів для масового
                                запрошення
                            </div>
                            <ButtonGroup className="flex-wrap">
                                {ROLES.map((item) => (
                                    <Button
                                        key={item}
                                        type="button"
                                        size="sm"
                                        variant={
                                            role === item
                                                ? 'primary'
                                                : 'outline-primary'
                                        }
                                        onClick={() => handleRoleChange(item)}
                                        disabled={busy}
                                    >
                                        {USER_ROLE_PLURAL_LABELS[item]}
                                    </Button>
                                ))}
                            </ButtonGroup>
                        </div>

                        <Button
                            variant="outline-success"
                            onClick={() => void handleDownloadTemplate()}
                            disabled={downloading}
                        >
                            {downloading ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Генерація шаблону…
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-file-earmark-excel me-2" />
                                    Завантажити шаблон Excel (.xlsx)
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Drag-and-drop зона для .xlsx / .csv */}
                    <div
                        className={`bulk-dropzone rounded p-4 text-center ${isDragging ? 'bulk-dropzone-active' : ''}`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.csv"
                            className="d-none"
                            onChange={handleFileInputChange}
                        />
                        {uploading ? (
                            <div className="py-2">
                                <Spinner
                                    animation="border"
                                    variant="primary"
                                    size="sm"
                                    className="me-2"
                                />
                                Читання та перевірка файлу…
                            </div>
                        ) : (
                            <>
                                <i className="bi bi-cloud-arrow-up fs-2 text-primary d-block mb-1" />
                                <div className="fw-medium mb-1">
                                    Перетягніть заповнений файл{' '}
                                    <code>.xlsx</code> або <code>.csv</code>{' '}
                                    сюди
                                </div>
                                <div className="small text-muted mb-2">
                                    Шаблон Excel містить випадаючі списки
                                    актуальних груп / підрозділів у межах ваших
                                    прав. Також можна вставляти рядки прямо в
                                    таблицю нижче через <kbd>Ctrl+V</kbd>.
                                </div>
                                <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    disabled={busy}
                                >
                                    <i className="bi bi-upload me-1" />
                                    Обрати файл із компʼютера
                                </Button>
                            </>
                        )}
                    </div>
                </Card.Body>
            </Card>

            {error && (
                <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setError(null)}
                    className="py-2 small mb-0"
                >
                    {error}
                </Alert>
            )}

            {infoBanner && (
                <Alert
                    variant="info"
                    dismissible
                    onClose={() => setInfoBanner(null)}
                    className="py-2 small mb-0"
                >
                    {infoBanner}
                </Alert>
            )}

            {/* Крок 2: Інтерактивна редагована таблиця */}
            <Card
                className="border-0 shadow-sm"
                onPaste={handleTablePaste}
            >
                <Card.Header className="bg-white d-flex flex-wrap justify-content-between align-items-center gap-2 py-2">
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="fw-semibold">
                            2. Редактор списку ({USER_ROLE_PLURAL_LABELS[role]})
                        </span>
                        <Badge bg="secondary">Усього: {totalCount}</Badge>
                        {validCount > 0 && (
                            <Badge bg="success">Готові: {validCount}</Badge>
                        )}
                        {invalidCount > 0 && (
                            <Badge bg="danger">
                                З помилками: {invalidCount}
                            </Badge>
                        )}
                        {unvalidatedCount > 0 && (
                            <Badge bg="warning" text="dark">
                                Не перевірено: {unvalidatedCount}
                            </Badge>
                        )}
                    </div>

                    <div className="d-flex flex-wrap gap-1">
                        <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => addRows(1)}
                            disabled={busy}
                        >
                            <i className="bi bi-plus-lg me-1" />
                            Рядок
                        </Button>
                        <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => addRows(5)}
                            disabled={busy}
                        >
                            +5 рядків
                        </Button>
                        {invalidCount > 0 && (
                            <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={removeInvalidRows}
                                disabled={busy}
                            >
                                Видалити помилкові
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => {
                                setRows([createEmptyRow(1)]);
                                setError(null);
                                setInfoBanner(null);
                            }}
                            disabled={busy}
                        >
                            Очистити
                        </Button>
                    </div>
                </Card.Header>

                <div className="table-responsive">
                    <Table
                        bordered
                        size="sm"
                        className="mb-0 align-middle bulk-grid-table"
                    >
                        <thead className="table-light small">
                            <tr>
                                <th className="text-center">#</th>
                                <th>Email *</th>
                                <th>Прізвище *</th>
                                <th>Імʼя *</th>
                                <th>По батькові</th>
                                {role === 'student' && (
                                    <>
                                        <th>№ студентського *</th>
                                        <th>Група *</th>
                                    </>
                                )}
                                {role === 'supervisor' && (
                                    <>
                                        <th>Кафедра *</th>
                                        <th>Посада</th>
                                        <th>Ступінь</th>
                                        <th>Звання</th>
                                    </>
                                )}
                                {role === 'admin' && (
                                    <>
                                        <th>
                                            Підрозділ
                                            {!catalog?.isSuperAdmin ? ' *' : ''}
                                        </th>
                                        <th>Посада</th>
                                    </>
                                )}
                                <th>Статус перевірки</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const rowClass = !row.validated
                                    ? ''
                                    : row.isValid
                                      ? 'table-success-subtle'
                                      : 'table-danger-subtle';

                                return (
                                    <tr key={row.localId} className={rowClass}>
                                        <td className="text-center small text-muted">
                                            {row.rowNumber}
                                        </td>
                                        <td>
                                            <Form.Control
                                                size="sm"
                                                type="email"
                                                placeholder="user@kpi.ua"
                                                value={row.email}
                                                onChange={(e) =>
                                                    updateRow(row.localId, {
                                                        email: e.target.value,
                                                    })
                                                }
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                size="sm"
                                                placeholder="Іваненко"
                                                value={row.lastName}
                                                onChange={(e) =>
                                                    updateRow(row.localId, {
                                                        lastName:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                size="sm"
                                                placeholder="Іван"
                                                value={row.firstName}
                                                onChange={(e) =>
                                                    updateRow(row.localId, {
                                                        firstName:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </td>
                                        <td>
                                            <Form.Control
                                                size="sm"
                                                placeholder="Іванович"
                                                value={row.patronymic}
                                                onChange={(e) =>
                                                    updateRow(row.localId, {
                                                        patronymic:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </td>

                                        {role === 'student' && (
                                            <>
                                                <td>
                                                    <Form.Control
                                                        size="sm"
                                                        placeholder="КВ12345678"
                                                        value={
                                                            row.studentNumber
                                                        }
                                                        onChange={(e) =>
                                                            updateRow(
                                                                row.localId,
                                                                {
                                                                    studentNumber:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <Form.Select
                                                        size="sm"
                                                        value={
                                                            row.groupId !== null
                                                                ? String(
                                                                      row.groupId,
                                                                  )
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            updateRow(
                                                                row.localId,
                                                                {
                                                                    groupId: e
                                                                        .target
                                                                        .value
                                                                        ? Number(
                                                                              e
                                                                                  .target
                                                                                  .value,
                                                                          )
                                                                        : null,
                                                                    groupRef: '',
                                                                },
                                                            )
                                                        }
                                                    >
                                                        <option value="">
                                                            {row.groupRef
                                                                ? `Не знайдено: ${row.groupRef}`
                                                                : '— Група —'}
                                                        </option>
                                                        {catalog?.groups.map(
                                                            (g) => (
                                                                <option
                                                                    key={g.id}
                                                                    value={String(
                                                                        g.id,
                                                                    )}
                                                                >
                                                                    {g.name} —{' '}
                                                                    {
                                                                        g.educationalProgramName
                                                                    }{' '}
                                                                    (
                                                                    {
                                                                        DEGREE_LEVEL_LABELS[
                                                                            g
                                                                                .degreeLevel
                                                                        ]
                                                                    }
                                                                    )
                                                                </option>
                                                            ),
                                                        )}
                                                    </Form.Select>
                                                </td>
                                            </>
                                        )}

                                        {role === 'supervisor' && (
                                            <>
                                                <td>
                                                    <Form.Select
                                                        size="sm"
                                                        value={
                                                            row.orgUnitId !==
                                                            null
                                                                ? String(
                                                                      row.orgUnitId,
                                                                  )
                                                                : ''
                                                        }
                                                        onChange={(e) =>
                                                            updateRow(
                                                                row.localId,
                                                                {
                                                                    orgUnitId: e
                                                                        .target
                                                                        .value
                                                                        ? Number(
                                                                              e
                                                                                  .target
                                                                                  .value,
                                                                          )
                                                                        : null,
                                                                    orgUnitRef:
                                                                        '',
                                                                },
                                                            )
                                                        }
                                                    >
                                                        <option value="">
                                                            {row.orgUnitRef
                                                                ? `Не знайдено: ${row.orgUnitRef}`
                                                                : '— Кафедра —'}
                                                        </option>
                                                        {catalog?.departments.map(
                                                            (d) => (
                                                                <option
                                                                    key={d.id}
                                                                    value={String(
                                                                        d.id,
                                                                    )}
                                                                >
                                                                    {d.shortName
                                                                        ? `${d.shortName} — ${d.name}`
                                                                        : d.name}
                                                                </option>
                                                            ),
                                                        )}
                                                    </Form.Select>
                                                </td>
                                                <td>
                                                    <Form.Control
                                                        size="sm"
                                                        placeholder="Доцент"
                                                        value={row.position}
                                                        onChange={(e) =>
                                                            updateRow(
                                                                row.localId,
                                                                {
                                                                    position:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <Form.Control
                                                        size="sm"
                                                        placeholder="к.т.н."
                                                        value={
                                                            row.academicDegree
                                                        }
                                                        onChange={(e) =>
                                                            updateRow(
                                                                row.localId,
                                                                {
                                                                    academicDegree:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                    />
                                                </td>
                                                <td>
                                                    <Form.Control
                                                        size="sm"
                                                        placeholder="доцент"
                                                        value={
                                                            row.academicTitle
                                                        }
                                                        onChange={(e) =>
                                                            updateRow(
                                                                row.localId,
                                                                {
                                                                    academicTitle:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                    />
                                                </td>
                                            </>
                                        )}

                                        {role === 'admin' && (
                                            <>
                                                <td>
                                                    <Form.Select
                                                        size="sm"
                                                        value={
                                                            row.orgUnitId !==
                                                            null
                                                                ? String(
                                                                      row.orgUnitId,
                                                                  )
                                                                : catalog?.isSuperAdmin &&
                                                                    !row.orgUnitRef
                                                                  ? SUPERADMIN_SELECT_VALUE
                                                                  : row.orgUnitRef ===
                                                                      SUPERADMIN_LABEL
                                                                    ? SUPERADMIN_SELECT_VALUE
                                                                    : ''
                                                        }
                                                        onChange={(e) => {
                                                            const val =
                                                                e.target.value;
                                                            if (
                                                                val ===
                                                                SUPERADMIN_SELECT_VALUE
                                                            ) {
                                                                updateRow(
                                                                    row.localId,
                                                                    {
                                                                        orgUnitId:
                                                                            null,
                                                                        orgUnitRef:
                                                                            SUPERADMIN_LABEL,
                                                                    },
                                                                );
                                                            } else {
                                                                updateRow(
                                                                    row.localId,
                                                                    {
                                                                        orgUnitId:
                                                                            val
                                                                                ? Number(
                                                                                      val,
                                                                                  )
                                                                                : null,
                                                                        orgUnitRef:
                                                                            '',
                                                                    },
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {catalog?.isSuperAdmin ? (
                                                            <option
                                                                value={
                                                                    SUPERADMIN_SELECT_VALUE
                                                                }
                                                            >
                                                                {
                                                                    SUPERADMIN_LABEL
                                                                }
                                                            </option>
                                                        ) : (
                                                            <option value="">
                                                                {row.orgUnitRef
                                                                    ? `Не знайдено: ${row.orgUnitRef}`
                                                                    : '— Підрозділ —'}
                                                            </option>
                                                        )}
                                                        {catalog?.orgUnits.map(
                                                            (u) => (
                                                                <option
                                                                    key={u.id}
                                                                    value={String(
                                                                        u.id,
                                                                    )}
                                                                >
                                                                    {u.orgPath}{' '}
                                                                    — {u.name}
                                                                </option>
                                                            ),
                                                        )}
                                                    </Form.Select>
                                                </td>
                                                <td>
                                                    <Form.Control
                                                        size="sm"
                                                        placeholder="Посада"
                                                        value={row.position}
                                                        onChange={(e) =>
                                                            updateRow(
                                                                row.localId,
                                                                {
                                                                    position:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            )
                                                        }
                                                    />
                                                </td>
                                            </>
                                        )}

                                        <td className="bulk-status-cell">
                                            {!row.validated ? (
                                                <span className="small text-muted">
                                                    Очікує перевірки
                                                </span>
                                            ) : row.isValid ? (
                                                <Badge bg="success">
                                                    <i className="bi bi-check-lg me-1" />
                                                    Готово
                                                </Badge>
                                            ) : (
                                                <ul className="mb-0 ps-3 small text-danger">
                                                    {row.errors.map(
                                                        (errText, i) => (
                                                            <li key={i}>
                                                                {errText}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            )}
                                        </td>

                                        <td className="text-center">
                                            <Button
                                                size="sm"
                                                variant="link"
                                                className="text-danger p-0"
                                                onClick={() =>
                                                    removeRow(row.localId)
                                                }
                                                disabled={busy}
                                                aria-label="Видалити рядок"
                                                title="Видалити рядок"
                                            >
                                                <i className="bi bi-trash" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </div>

                <Card.Footer className="bg-white d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
                    <div className="small text-muted">
                        Підказка: після редагування клітинок натисніть
                        «Перевірити список», а потім надішліть запрошення.
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        <Button
                            variant="outline-primary"
                            onClick={() => void runServerPreview(role, rows)}
                            disabled={busy}
                        >
                            {validating ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Перевірка…
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-shield-check me-1" />
                                    Перевірити список
                                </>
                            )}
                        </Button>

                        <Button
                            variant="primary"
                            onClick={() => void handleSubmitBulk()}
                            disabled={
                                busy ||
                                (unvalidatedCount === 0 && validCount === 0)
                            }
                        >
                            {submitting ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Надсилання…
                                </>
                            ) : invalidCount > 0 && validCount > 0 ? (
                                <>
                                    <i className="bi bi-send-check me-1" />
                                    Надіслати лише валідні ({validCount})
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-send me-1" />
                                    Надіслати запрошення
                                    {validCount > 0 ? ` (${validCount})` : ''}
                                </>
                            )}
                        </Button>
                    </div>
                </Card.Footer>
            </Card>
        </div>
    );
}
