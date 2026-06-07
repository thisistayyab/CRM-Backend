import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { PRODUCT_NAME, COMPANY_NAME, supportEmail } from '../constants/brand.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465;
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      minVersion: 'TLSv1.2',
    },
    pool: true,
    maxConnections: 3,
  });

  return transporter;
}

function parseEmailAddress(value) {
  if (!value) return '';
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

/** Gmail requires From to match the authenticated account — use Reply-To for support. */
function getFromAddress() {
  const authUser = process.env.SMTP_USER?.trim();
  const configuredFrom = process.env.SMTP_FROM?.trim();
  const host = (process.env.SMTP_HOST || '').toLowerCase();
  const isGmail = host.includes('gmail');

  if (isGmail && authUser) {
    return `"${PRODUCT_NAME}" <${authUser}>`;
  }

  if (configuredFrom?.includes('<')) {
    return configuredFrom;
  }

  const email = parseEmailAddress(configuredFrom) || authUser || supportEmail();
  return `"${PRODUCT_NAME} — ${COMPANY_NAME}" <${email}>`;
}

function getEnvelopeFrom() {
  return process.env.SMTP_USER?.trim() || parseEmailAddress(process.env.SMTP_FROM) || supportEmail();
}

function getMessageDomain(fromAddress) {
  const email = parseEmailAddress(fromAddress);
  const domain = email.split('@')[1];
  return domain || 'taylancetech.com';
}

export const sendMail = async ({ to, subject, html, text }) => {
  const from = getFromAddress();
  const replyTo = supportEmail();
  const domain = getMessageDomain(from);
  const plainText = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const mailOptions = {
    from,
    to,
    replyTo,
    sender: getEnvelopeFrom(),
    subject,
    text: plainText,
    html,
    envelope: {
      from: getEnvelopeFrom(),
      to,
    },
    messageId: `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@${domain}>`,
    headers: {
      'X-Mailer': PRODUCT_NAME,
      'X-Entity-Ref-ID': `${Date.now()}-${to}`,
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
      Importance: 'normal',
      'MIME-Version': '1.0',
    },
  };

  await getTransporter().sendMail(mailOptions);
};
