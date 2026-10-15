import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';

export async function GET(_request, { params }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    if (sessionUser.role !== 'admin') return NextResponse.json({ error: 'ไม่มีสิทธิ์ดำเนินการ' }, { status: 403 });

    const { id } = await params;
    const userId = Number(id);
    if (!Number.isSafeInteger(userId) || userId < 1) return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้' }, { status: 404 });

    const database = getDatabase();
    const [users] = await database.execute(
      'SELECT id, email, username, full_name, phone, role, created_at FROM users WHERE id = ?',
      [userId],
    );
    if (!users.length) return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้' }, { status: 404 });

    const [bookings] = await database.execute(
      `SELECT order_number, service_name, service_date, site_visit_date, status, created_at
      FROM bookings WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
    );
    return NextResponse.json({ user: users[0], bookings });
  } catch (error) {
    console.error('Admin user details lookup failed:', error);
    return NextResponse.json({ error: 'โหลดรายละเอียดผู้ใช้ไม่สำเร็จ' }, { status: 500 });
  }
}