import { env } from "@viraltiktokslideshows/env/server";
import nodemailer from "nodemailer";

// Spacemail (Spaceship's mailbox product) SMTP endpoint. Port 465 is
// implicit TLS ("SSL" in most mail-client UIs), hence `secure: true` — this
// is different from port 587's STARTTLS, which negotiates TLS after
// connecting and needs `secure: false`.
export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

export async function sendMail(options: { to: string; subject: string; html: string; text: string }) {
  await mailer.sendMail({
    from: env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
