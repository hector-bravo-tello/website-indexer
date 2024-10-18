import nodemailer from 'nodemailer';
import CONFIG from '@/config';

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: CONFIG.email.host,
  port: CONFIG.email.port,
  secure: CONFIG.email.secure, // true for 465, false for other ports
  auth: {
    user: CONFIG.email.user,
    pass: CONFIG.email.password,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: CONFIG.email.from,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}

export function generateIndexingEmail(domain: string, submittedUrls: string[]): string {
  return `
    <h1>Indexing Report for ${domain}</h1>
    <p>The following URLs have been submitted for indexing:</p>
    <ul>
      ${submittedUrls.map(url => `<li>${url}</li>`).join('')}
    </ul>
    <p>Total URLs submitted: ${submittedUrls.length}</p>
  `;
}