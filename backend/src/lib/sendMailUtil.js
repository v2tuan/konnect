import sgMail from '@sendgrid/mail';
import { env } from '../config/environment.js';
import nodemailer from 'nodemailer'

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM_EMAIL,
  SMTP_FROM_NAME
} = process.env

// Tạo transporter 1 lần
const transporter = nodemailer.createTransport({
  host: SMTP_HOST || 'smtp.gmail.com',
  port: Number(SMTP_PORT || 465),
  secure: String(SMTP_SECURE ?? 'true') === 'true', // 465 = true
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
})

// (không bắt buộc) verify kết nối lúc khởi động:
transporter.verify().then(() => {
  console.log('📧 SMTP connected and ready')
}).catch(err => {
  console.error('❌ SMTP verify failed:', err?.message || err)
})

/**
 * Gửi mail HTML (fallback text nếu cần)
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html
 */
export default async function sendMail(to, subject, text, html) {
  if (!to) throw new Error('Missing "to" email')
  const fromName = SMTP_FROM_NAME || 'Konnect'
  const fromEmail = SMTP_FROM_EMAIL || SMTP_USER

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text: text || undefined,
    html: html || undefined
  })

  // Bạn có thể log messageId/response để debug
  // console.log('Mail sent:', info.messageId, info.response)
  return info
}

// sgMail.setApiKey(env.SENDGRID_API_KEY);
//
// const sendMail = async (to, subject, text, html) => {
//     try {
//         const msg = {
//             to,
//             from: env.FROM_EMAIL,
//             subject,
//             text,
//             html,
//         };
//         await sgMail.send(msg);
//         console.log(`Email sent to ${to}"`);
//     } catch (error) {
//         throw error;
//     }
// };
//
// export default sendMail;