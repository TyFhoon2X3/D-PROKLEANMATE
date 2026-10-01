import { NextResponse } from 'next/server';
import { createSession, verifyPassword } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const database = getDatabase();
    const [rows] = await database.execute(
      'SELECT id, email, username, full_name, phone, role, created_at, password_hash FROM users WHERE email = ?',
      [normalizedEmail],
    );
    const user = rows[0];
    if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
      return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หากยังไม่มีบัญชีให้สมัครสมาชิกก่อน' }, { status: 401 });
    }

    await createSession(Number(user.id));
    delete user.password_hash;
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json({ error: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}