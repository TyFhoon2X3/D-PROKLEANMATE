import { createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mysql';

export async function POST(request) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM;
  if (!smtpHost || !smtpUser || !smtpPassword || !smtpFrom) {
    return NextResponse.json({ error: 'ระบบส่งอีเมลยังไม่ได้ตั้งค่า SMTP' }, { status: 503 });
  }

  try {
    const { email } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const database = getDatabase();
    const [users] = await database.execute('SELECT id, email FROM users WHERE email = ?', [normalizedEmail]);
    if (!users.length) return NextResponse.json({ ok: true });

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await database.execute(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))
       ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at)`,
      [users[0].id, tokenHash],
    );

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });
    const resetUrl = new URL(`/auth/reset-password?token=${token}`, process.env.APP_URL || new URL(request.url).origin);
    await transporter.sendMail({
      from: smtpFrom,
      to: users[0].email,
      subject: 'ตั้งรหัสผ่าน D-PROKLEANMATE ใหม่',
      text: `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ภายใน 30 นาที: ${resetUrl}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Password reset email failed:', error);
    return NextResponse.json({ error: 'ส่งอีเมลรีเซ็ตรหัสผ่านไม่สำเร็จ' }, { status: 500 });
  }
}