import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';

export async function POST(request) {
  let connection;
  try {
    const { token, password } = await request.json();
    if (!/^[a-f0-9]{64}$/i.test(String(token || '')) || String(password || '').length < 6) {
      return NextResponse.json({ error: 'ลิงก์ไม่ถูกต้องหรือรหัสผ่านสั้นเกินไป' }, { status: 400 });
    }

    const database = getDatabase();
    connection = await database.getConnection();
    await connection.beginTransaction();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const [rows] = await connection.execute(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = ? AND expires_at > NOW() FOR UPDATE`,
      [tokenHash],
    );
    if (!rows.length) {
      await connection.rollback();
      return NextResponse.json({ error: 'ลิงก์หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่' }, { status: 400 });
    }

    await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(password), rows[0].user_id]);
    await connection.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [rows[0].user_id]);
    await connection.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Password reset failed:', error);
    return NextResponse.json({ error: 'เปลี่ยนรหัสผ่านไม่สำเร็จ' }, { status: 500 });
  } finally {
    connection?.release();
  }
}