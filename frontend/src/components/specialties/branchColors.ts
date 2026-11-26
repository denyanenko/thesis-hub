import type { CSSProperties } from 'react';

export const KNOWLEDGE_BRANCH_LABELS: Record<string, string> = {
    A: 'A — Освіта',
    B: 'B — Культура, мистецтво та гуманітарні науки',
    C: 'C — Соціальні науки, журналістика та інформація',
    D: 'D — Бізнес, адміністрування та право',
    E: 'E — Природничі науки, математика та статистика',
    F: 'F — Інформаційні технології',
    G: 'G — Інженерія, виробництво та будівництво',
    H: 'H — Сільське, лісове, рибне господарство та ветеринарна медицина',
    I: 'I — Охорона здоровʼя та соціальне забезпечення',
    J: 'J — Транспорт та послуги',
    K: 'K — Безпека та оборона',
};

interface BranchColorSpec {
    hue: number;
    satBg?: number;
    satText?: number;
    satBorder?: number;
}

/**
 * Гармонійна приглушена палітра для 11 галузей класифікатора МОН 2024 (A–K).
 * Виразні, але спокійні для очей відтінки, що чітко контрастують із білим фоном.
 */
const KNOWN_BRANCH_COLORS: Record<string, BranchColorSpec> = {
    A: { hue: 204, satBg: 72, satText: 68, satBorder: 56 }, // небесно-синій
    B: { hue: 272, satBg: 58, satText: 54, satBorder: 46 }, // фіолетово-сливовий
    C: { hue: 38, satBg: 78, satText: 68, satBorder: 58 },  // бурштиновий
    D: { hue: 152, satBg: 56, satText: 60, satBorder: 46 }, // смарагдовий
    E: { hue: 180, satBg: 56, satText: 60, satBorder: 46 }, // бірюзовий (teal)
    F: { hue: 228, satBg: 72, satText: 62, satBorder: 54 }, // індиго (ІТ)
    G: { hue: 20, satBg: 74, satText: 64, satBorder: 54 },  // теракотовий
    H: { hue: 94, satBg: 50, satText: 54, satBorder: 44 },  // оливково-зелений
    I: { hue: 342, satBg: 66, satText: 58, satBorder: 50 }, // приглушений рожевий
    J: { hue: 214, satBg: 38, satText: 42, satBorder: 34 }, // сталевий сланцевий
    K: { hue: 358, satBg: 60, satText: 56, satBorder: 48 }, // гранатовий
};

const GOLDEN_ANGLE = 137.508;

/**
 * Виділяє ключ освітньої галузі з коду спеціальності:
 * - 'F6' → 'F', 'L1' → 'L' (новий класифікатор і майбутні літерні галузі)
 * - 'XY88' → 'XY' (міждисциплінарні коди)
 * - '126' → '12' (старий класифікатор 2015, де перші 2 цифри — галузь)
 */
export function getSpecialtyBranchKey(code: string): string {
    const normalized = code.trim().toUpperCase();
    const letterPrefix = /^([A-ZА-ЯІЇЄҐ]+)/.exec(normalized);
    if (letterPrefix) {
        return letterPrefix[1];
    }
    const digitPrefix = /^(\d{2})/.exec(normalized);
    if (digitPrefix) {
        return digitPrefix[1];
    }
    return normalized || 'OTHER';
}

export function getBranchLabel(branchKey: string): string {
    if (branchKey in KNOWLEDGE_BRANCH_LABELS) {
        return KNOWLEDGE_BRANCH_LABELS[branchKey];
    }
    if (/^\d{2}$/.test(branchKey)) {
        return `Галузь ${branchKey} (архівний код)`;
    }
    return `Галузь ${branchKey}`;
}

/**
 * Детермінований FNV-1a хеш для автоматичного призначення стабільного кольору
 * новим або нестандартним галузям без збереження кольорів у БД.
 */
function hashString(input: string): number {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function getDynamicBranchColor(branchKey: string): BranchColorSpec {
    // Для нових латинських літер після K (L, M, N...) беремо послідовний крок золотим кутом,
    // щоб сусідні нові галузі гарантовано мали візуально далекі відтінки.
    if (/^[A-Z]$/.test(branchKey)) {
        const index = branchKey.charCodeAt(0) - 'A'.charCodeAt(0);
        const hue = Math.round((index * GOLDEN_ANGLE + 45) % 360);
        return { hue, satBg: 60, satText: 56, satBorder: 48 };
    }

    const index = hashString(branchKey);
    const hue = Math.round((index * GOLDEN_ANGLE) % 360);
    return { hue, satBg: 54, satText: 54, satBorder: 44 };
}

/**
 * Повертає стабільний стиль бейджа коду спеціальності за її галуззю.
 * Неактивні спеціальності навмисно приглушуються в нейтральний сірий,
 * щоб одразу візуально відрізнятися від актуальних.
 */
export function getSpecialtyCodeStyle(code: string, isActive: boolean): CSSProperties {
    if (!isActive) {
        return {
            backgroundColor: '#e9ecef',
            color: '#495057',
            border: '1px solid #ced4da',
        };
    }

    const branchKey = getSpecialtyBranchKey(code);
    const spec = KNOWN_BRANCH_COLORS[branchKey] ?? getDynamicBranchColor(branchKey);
    const satBg = spec.satBg ?? 62;
    const satText = spec.satText ?? 58;
    const satBorder = spec.satBorder ?? 48;

    return {
        backgroundColor: `hsl(${spec.hue}, ${satBg}%, 86%)`,
        color: `hsl(${spec.hue}, ${satText}%, 22%)`,
        border: `1px solid hsl(${spec.hue}, ${satBorder}%, 68%)`,
    };
}
