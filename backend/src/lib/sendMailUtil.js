import sgMail from '@sendgrid/mail';
import { env } from '../config/environment.js';

sgMail.setApiKey(env.SENDGRID_API_KEY);

const sendMail = async (to, subject, text, html) => {
    try {
        const msg = {
            to,
            from: env.FROM_EMAIL,
            subject,
            text,
            html,
        };
        await sgMail.send(msg);
        console.log(`Email sent to ${to}"`);
    } catch (error) {
        throw error;
    }
};

export default sendMail;