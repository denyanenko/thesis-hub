import { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import { useProfile } from '../auth/useProfile';
import type { UserRole } from '../api/auth';

const ROLE_LABELS: Record<UserRole, string> = {
    student: 'Студент',
    supervisor: 'Науковий керівник',
    admin: 'Адміністратор',
};


/** Один рядок «назва: значення». Порожнє значення показуємо як «—». */
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <Row className="py-2 border-bottom">
            <Col sm={4} className="text-muted">
                {label}
            </Col>
            <Col sm={8} className="fw-medium">
                {value ?? '—'}
            </Col>
        </Row>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <h2 className="h5 mb-2">{title}</h2>
            {children}
        </div>
    );
}

export default function ProfilePage() {
    const { data: profile, isPending, isError, error } = useProfile();
    const [notice, setNotice] = useState<string | null>(null);


    if (isPending) {
        return (
            <Container className="py-5 text-center">
                <Spinner />
            </Container>
        );
    }

    if (isError) {
        return (
            <Container className="py-5">
                <Alert variant="danger">
                    {error instanceof Error ? error.message : 'Не вдалося завантажити профіль'}
                </Alert>
            </Container>
        );
    }

    const fullName = [profile.lastName, profile.firstName, profile.patronymic]
        .filter(Boolean)
        .join(' ');

    return (
        <Container className="py-5">
            <Card className="mx-auto shadow-sm" style={{ maxWidth: 720 }}>
                <Card.Body className="p-4">
                    {/* Шапка */}
                    <div className="d-flex align-items-center mb-4">
                        <i className="bi bi-person-circle text-secondary me-3" style={{ fontSize: '3.5rem' }} />
                        <div>
                            <h1 className="h4 mb-1">{fullName}</h1>
                            <div className="text-muted mb-1">{profile.email}</div>
                            <Badge bg="primary">{ROLE_LABELS[profile.role]}</Badge>
                        </div>
                    </div>

                    {profile.student && (
                        <Section title="Навчання">
                            <InfoRow label="Номер студентського" value={profile.student.studentNumber} />
                            <InfoRow label="Група" value={profile.student.group.name} />
                            <InfoRow label="Рік вступу" value={profile.student.group.enrollmentYear} />
                            <InfoRow
                                label="Спеціальність"
                                value={`${profile.student.group.educationalProgram.specialty.code} ${profile.student.group.educationalProgram.specialty.name}`}
                            />
                            <InfoRow
                                label="Освітня програма"
                                value={profile.student.group.educationalProgram.name}
                            />
                            <InfoRow
                                label="Рівень"
                                value={profile.student.group.educationalProgram.degreeLevel}
                            />
                        </Section>
                    )}

                    {profile.supervisor && (
                        <Section title="Академічна інформація">
                            <InfoRow label="Науковий ступінь" value={profile.supervisor.academicDegree} />
                            <InfoRow label="Вчене звання" value={profile.supervisor.academicTitle} />
                            <InfoRow label="Посада" value={profile.supervisor.position} />
                            <InfoRow label="Підрозділ" value={profile.supervisor.orgUnit.name} />
                        </Section>
                    )}

                    {profile.admin && (
                        <Section title="Робота">
                            <InfoRow label="Посада" value={profile.admin.position} />
                            <InfoRow label="Підрозділ" value={profile.admin.orgUnit?.name} />
                        </Section>
                    )}

                    <Section title="Зміна даних">
                        {notice && (
                            <Alert variant="danger" dismissible onClose={() => setNotice(null)} className="py-2">
                                {notice}
                            </Alert>
                        )}
                        <div className="d-grid gap-2">
                            <Button
                                variant="outline-primary"
                                onClick={() => setNotice('Зміну пошти ще не реалізовано')}
                            >
                                Змінити пошту
                            </Button>
                            <Button
                                variant="outline-warning"
                                onClick={() => setNotice('Зміну пароля ще не реалізовано')}
                            >
                                Змінити пароль
                            </Button>
                        </div>
                    </Section>
                </Card.Body>
            </Card>
        </Container>
    );
}