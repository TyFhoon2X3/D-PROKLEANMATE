import { NextResponse } from 'next/server';
import { createSession, hashPassword } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';

export async function POST(request) {
  try {
    const { email, password, fullName, phone, username } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || String(password || '').length < 6) {
      return NextResponse.json({ error: 'กรุณาตรวจสอบอีเมลและรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)' }, { status: 400 });
    }

    const database = getDatabase();
    const [result] = await database.execute(
      'INSERT INTO users (email, password_hash, username, full_name, phone) VALUES (?, ?, ?, ?, ?)',
      [normalizedEmail, hashPassword(password), username || null, fullName || null, phone || null],
    );
    await createSession(Number(result.insertId));

    return NextResponse.json({ user: { id: Number(result.insertId), email: normalizedEmail, username, full_name: fullName, phone, role: 'user' } }, { status: 201 });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ' }, { status: 409 });
    }
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
  }
}