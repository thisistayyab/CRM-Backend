export const PRODUCT_NAME = 'Taylance CRM';
export const COMPANY_NAME = 'Taylance Tech';
export const COMPANY_URL = 'https://taylancetech.com';

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'hello@taylancetech.com';

export const supportEmail = () => SUPPORT_EMAIL;

export const emailFooter = () => {
  const email = supportEmail();
  const helpLine = email
    ? `Need help? Email <a href="mailto:${email}" style="color: #06B6D4;">${email}</a>`
    : `Learn more at <a href="${COMPANY_URL}" style="color: #06B6D4;">${COMPANY_NAME}</a>`;
  return `
    <hr style="margin-top: 30px; border: none; border-top: 1px solid #334155;">
    <p style="font-size: 13px; color: #94A3B8;">
      ${helpLine}<br>
      <a href="${COMPANY_URL}" style="color: #06B6D4;">${PRODUCT_NAME}</a> by ${COMPANY_NAME}
    </p>
  `;
};
