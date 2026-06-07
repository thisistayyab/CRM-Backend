import { PRODUCT_NAME, COMPANY_NAME, COMPANY_URL, supportEmail } from '../constants/brand.js';

const BRAND = '#06B6D4';
const BRAND_BRIGHT = '#22D3EE';
const BRAND_DARK = '#0891B2';
const BG_DARK = '#0F172A';
const SURFACE = '#1E293B';
const TEXT = '#F8FAFC';
const MUTED = '#94A3B8';
const BORDER = '#334155';

function baseTemplate({ title, preheader, content, code, codeLabel = 'Your code', expiryText }) {
  const help = supportEmail();
  const year = new Date().getFullYear();

  const codeBlock = code ? `
    <tr>
      <td style="padding:0 32px 8px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;">${codeLabel}</p>
        <div style="background:linear-gradient(135deg,#ecfeff,#cffafe);border:1px solid #67e8f9;border-radius:12px;padding:20px 24px;text-align:center;">
          <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.28em;color:${BRAND_DARK};">${code}</span>
        </div>
        ${expiryText ? `<p style="margin:12px 0 0;font-size:13px;color:#94a3b8;text-align:center;">${expiryText}</p>` : ''}
      </td>
    </tr>
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if !mso]><!-->
  <style>
    @media only screen and (max-width:620px){
      .container{width:100%!important;padding:16px!important}
      .card{border-radius:12px!important}
      .px{padding-left:20px!important;padding-right:20px!important}
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;" class="container">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;" class="card">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_BRIGHT},${BRAND},#38BDF8);border-radius:16px 16px 0 0;padding:28px 32px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);letter-spacing:0.04em;text-transform:uppercase;">${PRODUCT_NAME}</p>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px 0 24px;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="px" style="padding:0 32px 20px;font-size:15px;line-height:1.65;color:#334155;">${content}</td>
                </tr>
                ${codeBlock}
                <tr>
                  <td class="px" style="padding:24px 32px 0;border-top:1px solid #e2e8f0;">
                    <p style="margin:0 0 6px;font-size:13px;color:#64748b;">
                      ${help ? `Questions? Reply to this email or contact <a href="mailto:${help}" style="color:${BRAND};text-decoration:none;">${help}</a>.` : `Learn more at <a href="${COMPANY_URL}" style="color:${BRAND};text-decoration:none;">${COMPANY_NAME}</a>.`}
                    </p>
                    <p style="margin:0;font-size:12px;color:#94a3b8;">
                      <a href="${COMPANY_URL}" style="color:${BRAND};text-decoration:none;">${COMPANY_NAME}</a> · ${PRODUCT_NAME}<br/>
                      © ${year} ${COMPANY_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;max-width:560px;line-height:1.5;">
          You received this email because an action was requested on your ${PRODUCT_NAME} account.
          If you did not request this, you can safely ignore this message.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    title,
    '',
    preheader,
    '',
    content.replace(/<[^>]+>/g, ''),
    code ? `\n${codeLabel}: ${code}` : '',
    expiryText ? `\n${expiryText}` : '',
    '',
    help ? `Support: ${help}` : `${COMPANY_NAME}: ${COMPANY_URL}`,
  ].filter(Boolean).join('\n');

  return { html, text };
}

export function verificationEmail(code) {
  return baseTemplate({
    title: 'Verify your email',
    preheader: `Complete your ${PRODUCT_NAME} signup — your verification code is inside.`,
    content: `<p style="margin:0 0 12px;">Welcome to <strong>${PRODUCT_NAME}</strong>! Enter the code below to complete your registration and start managing orders.</p><p style="margin:0;color:#64748b;">Never share this code with anyone — our team will never ask for it.</p>`,
    code,
    codeLabel: 'Verification code',
    expiryText: 'Expires in 15 minutes',
  });
}

export function resendVerificationEmail(code) {
  return baseTemplate({
    title: 'New verification code',
    preheader: `Your new ${PRODUCT_NAME} verification code is inside this email.`,
    content: `<p style="margin:0 0 12px;">You requested a new verification code for <strong>${PRODUCT_NAME}</strong>. Use the code below to continue signing up.</p>`,
    code,
    codeLabel: 'Verification code',
    expiryText: 'Expires in 15 minutes',
  });
}

export function passwordResetEmail(code) {
  return baseTemplate({
    title: 'Reset your password',
    preheader: `Reset your ${PRODUCT_NAME} password — your code is inside this email.`,
    content: `<p style="margin:0 0 12px;">We received a request to reset your <strong>${PRODUCT_NAME}</strong> password. Enter this code in the app to choose a new password.</p><p style="margin:0;color:#64748b;">If you didn't request a reset, ignore this email — your password will stay the same.</p>`,
    code,
    codeLabel: 'Reset code',
    expiryText: 'Expires in 10 minutes',
  });
}
