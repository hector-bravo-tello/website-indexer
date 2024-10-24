import { createEmailNotification, getUserById } from '@/models';
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

function generateEmailBody(domain: string, submittedUrls: string[]): string {
  return `
    <h1>Indexing Report for ${domain}</h1>
    <p>The following URLs have been submitted for indexing:</p>
    <ul>
      ${submittedUrls.map(url => `<li>${url}</li>`).join('')}
    </ul>
    <p>Total URLs submitted: ${submittedUrls.length}</p>
  `;
}

export async function sendEmailNotification(websiteId: number, userId: number, domain: string, type: 'job_complete' | 'job_failed', submittedUrls: string[]) {
  try {
    // generate the email body
    const content = generateEmailBody(domain, submittedUrls);
    
    const { user } = await getUserById(userId);
    if (user && user.email) {
      // send the email
      await sendEmail({
        to: user.email,
        subject: `Indexing ${type === 'job_complete' ? 'Completed' : 'Failed'}`,
        html: content,
      });
      console.log(`Email notification sent to ${user.email} for website ${domain}`);

    // add a record to the email_notifications table in database
    await createEmailNotification({
      user_id: userId,
      website_id: websiteId,
      type,
      content
    });

    } else {
      console.error(`User email not found for user ID ${userId}`);
    }

  } catch (error) {
    console.error(`Error sending email notification for website ${domain}:`, error);
  }
}