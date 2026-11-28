import { APP_NAME } from '../config/app.constants.js';

export interface MailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function resetPasswordTemplate(link: string): MailTemplate {
  return {
    subject: 'Відновлення пароля',
    text: [
      'Вітаємо!',
      '',
      `Ми отримали запит на відновлення пароля до вашого акаунта в ${APP_NAME}.`,
      'Щоб встановити новий пароль, перейдіть за посиланням:',
      link,
      '',
      'Посилання дійсне 1 годину.',
      'Якщо ви не надсилали цей запит, просто проігноруйте лист: ваш пароль залишиться без змін.',
    ].join('\n'),
    html: `
      <p>Вітаємо!</p>
      <p>Ми отримали запит на відновлення пароля до вашого акаунта в ${APP_NAME}.</p>
      <p>Щоб встановити новий пароль, <a href="${link}">перейдіть за посиланням</a>.</p>
      <p>Посилання дійсне 1 годину.</p>
      <p>Якщо ви не надсилали цей запит, просто проігноруйте лист: ваш пароль залишиться без змін.</p>
    `,
  };
}

export function passwordChangedTemplate(emergencyLink?: string): MailTemplate {
  if (emergencyLink) {
    return {
      subject: 'Пароль змінено',
      text: [
        'Вітаємо!',
        '',
        `Пароль до вашого акаунта в ${APP_NAME} щойно було змінено.`,
        'Усі інші активні сеанси завершено.',
        '',
        'Якщо це були не ви — негайно заблокуйте всі сеанси та задайте новий пароль за посиланням (дійсне 24 години):',
        emergencyLink,
      ].join('\n'),
      html: `
        <p>Вітаємо!</p>
        <p>Пароль до вашого акаунта в ${APP_NAME} щойно було змінено.</p>
        <p>Усі інші активні сеанси завершено.</p>
        <p>Якщо це були не ви — <a href="${emergencyLink}">негайно заблокуйте всі сеанси та задайте новий пароль</a> (посилання дійсне 24 години).</p>
      `,
    };
  }

  return {
    subject: 'Пароль змінено',
    text: [
      'Вітаємо!',
      '',
      `Пароль до вашого акаунта в ${APP_NAME} щойно було змінено.`,
      'Усі активні сеанси завершено, тож для входу використайте новий пароль.',
      'Якщо це були не ви, зверніться до адміністратора.',
    ].join('\n'),
    html: `
      <p>Вітаємо!</p>
      <p>Пароль до вашого акаунта в ${APP_NAME} щойно було змінено.</p>
      <p>Усі активні сеанси завершено, тож для входу використайте новий пароль.</p>
      <p>Якщо це були не ви, зверніться до адміністратора.</p>
    `,
  };
}

export function confirmEmailChangeTemplate(
  link: string,
  newEmail: string,
): MailTemplate {
  return {
    subject: 'Підтвердження нової електронної пошти',
    text: [
      'Вітаємо!',
      '',
      `Ми отримали запит на зміну електронної пошти вашого акаунта в ${APP_NAME} на ${newEmail}.`,
      'Щоб підтвердити зміну, перейдіть за посиланням:',
      link,
      '',
      'Посилання дійсне 1 годину.',
      'Якщо ви не надсилали цей запит, просто проігноруйте лист.',
    ].join('\n'),
    html: `
      <p>Вітаємо!</p>
      <p>Ми отримали запит на зміну електронної пошти вашого акаунта в ${APP_NAME} на <strong>${newEmail}</strong>.</p>
      <p>Щоб підтвердити зміну, <a href="${link}">перейдіть за посиланням</a>.</p>
      <p>Посилання дійсне 1 годину.</p>
      <p>Якщо ви не надсилали цей запит, просто проігноруйте лист.</p>
    `,
  };
}

export function emailChangedTemplate(
  newEmail: string,
  revertLink: string,
): MailTemplate {
  return {
    subject: 'Електронну пошту змінено',
    text: [
      'Вітаємо!',
      '',
      `Електронну пошту вашого акаунта в ${APP_NAME} щойно було змінено на ${newEmail}.`,
      'Усі активні сеанси завершено.',
      '',
      'Якщо це були не ви — ви можете повернути стару пошту, заблокувати всі сеанси та змінити пароль за посиланням (дійсне 24 години):',
      revertLink,
    ].join('\n'),
    html: `
      <p>Вітаємо!</p>
      <p>Електронну пошту вашого акаунта в ${APP_NAME} щойно було змінено на <strong>${newEmail}</strong>.</p>
      <p>Усі активні сеанси завершено.</p>
      <p>Якщо це були не ви — <a href="${revertLink}">поверніть стару пошту, заблокуйте сеанси та змініть пароль</a> (посилання дійсне 24 години).</p>
    `,
  };
}

export function emailChangeRevertedTemplate(): MailTemplate {
  return {
    subject: 'Зміну електронної пошти скасовано',
    text: [
      'Вітаємо!',
      '',
      `Зміну електронної пошти на цю адресу в ${APP_NAME} було скасовано через посилання безпеки зі старої поштової скриньки.`,
      'Усі активні сеанси завершено.',
      'Якщо це були не ви, негайно зверніться до адміністратора.',
    ].join('\n'),
    html: `
      <p>Вітаємо!</p>
      <p>Зміну електронної пошти на цю адресу в ${APP_NAME} було скасовано через посилання безпеки зі старої поштової скриньки.</p>
      <p>Усі активні сеанси завершено.</p>
      <p>Якщо це були не ви, негайно зверніться до адміністратора.</p>
    `,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export interface UserInvitationTemplateParams {
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  roleLabel: string;
  contextLabel?: string | null;
  link: string;
  expiresAtLabel: string;
}

export function userInvitationTemplate(
  params: UserInvitationTemplateParams,
): MailTemplate {
  const fullName = [params.lastName, params.firstName, params.patronymic]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ');

  const safeFullName = escapeHtml(fullName);
  const safeRole = escapeHtml(params.roleLabel);
  const safeContext = params.contextLabel
    ? escapeHtml(params.contextLabel)
    : null;
  const safeExpires = escapeHtml(params.expiresAtLabel);

  const contextTextLine = params.contextLabel
    ? `Підрозділ / група: ${params.contextLabel}.`
    : null;
  const contextHtmlLine = safeContext
    ? `<p><strong>Підрозділ / група:</strong> ${safeContext}</p>`
    : '';

  return {
    subject: `Запрошення до системи ${APP_NAME}`,
    text: [
      `Вітаємо, ${fullName}!`,
      '',
      `Вас запрошено до інформаційної системи ${APP_NAME} з роллю «${params.roleLabel}».`,
      ...(contextTextLine ? [contextTextLine] : []),
      '',
      'Щоб активувати акаунт і встановити пароль, перейдіть за посиланням:',
      params.link,
      '',
      `Посилання дійсне до ${params.expiresAtLabel}.`,
      'Якщо ви отримали цей лист помилково, просто проігноруйте його.',
    ].join('\n'),
    html: `
      <p>Вітаємо, <strong>${safeFullName}</strong>!</p>
      <p>Вас запрошено до інформаційної системи <strong>${APP_NAME}</strong> з роллю <strong>«${safeRole}»</strong>.</p>
      ${contextHtmlLine}
      <p>Щоб активувати акаунт і встановити пароль, <a href="${params.link}">перейдіть за посиланням</a>.</p>
      <p>Посилання дійсне до <strong>${safeExpires}</strong>.</p>
      <p style="color:#6c757d;font-size:0.9em;">Якщо ви отримали цей лист помилково, просто проігноруйте його.</p>
    `,
  };
}
