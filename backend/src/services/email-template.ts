export interface EmailTemplateInput {
  title: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  footerText?: string;
}

const FONT_STACK = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const ACCENT_COLOR = '#8844CC';
const TEXT_COLOR = '#1e293b';
const MUTED_COLOR = '#64748b';
const PAGE_BG = '#f1f5f9';
const CARD_BG = '#ffffff';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderEmailTemplate(input: EmailTemplateInput): string {
  const title = escapeHtml(input.title);
  const cta = input.ctaUrl && input.ctaUrl.trim() !== ''
    ? { url: escapeHtml(input.ctaUrl), label: escapeHtml(input.ctaLabel || 'Voir sur le site') }
    : null;
  const footer = input.footerText && input.footerText.trim() !== ''
    ? escapeHtml(input.footerText)
    : "Ceci est un message automatique de JdRoll — merci de ne pas y répondre directement.";

  const ctaBlock = cta
    ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 8px auto;">
            <tr>
              <td style="border-radius:8px;background-color:${ACCENT_COLOR};text-align:center;">
                <a href="${cta.url}" style="display:inline-block;padding:14px 32px;font-family:${FONT_STACK};font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${ACCENT_COLOR};">${cta.label}</a>
              </td>
            </tr>
          </table>
          <p style="margin:8px 0 0 0;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:${MUTED_COLOR};text-align:center;word-break:break-all;">
            Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br />
            <a href="${cta.url}" style="color:${ACCENT_COLOR};">${cta.url}</a>
          </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${CARD_BG};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background-color:${ACCENT_COLOR};padding:20px 32px;">
              <span style="font-family:${FONT_STACK};font-size:22px;font-weight:bold;color:#ffffff;">JdRoll</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:20px;line-height:1.4;color:${TEXT_COLOR};">${title}</h1>
              <div style="font-family:${FONT_STACK};font-size:16px;line-height:1.6;color:${TEXT_COLOR};">
                ${input.bodyHtml}
              </div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${MUTED_COLOR};">${footer}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
