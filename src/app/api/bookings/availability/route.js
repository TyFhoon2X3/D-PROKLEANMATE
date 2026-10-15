import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';

export async function GET(request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });

    const month = new URL(request.url).searchParams.get('month') || '';
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) return NextResponse.json({ error: 'เดือนไม่ถูกต้อง' }, { status: 400 });

    const monthStart = `${match[1]}-${match[2]}-01`;
    const nextMonth = new Date(Date.UTC(Number(match[1]), Number(match[2]), 1))
      .toISOString()
      .slice(0, 10);
    const excludeId = new URL(request.url).searchParams.get('exclude');
    const database = getDatabase();
    const [rows] = /^\d+$/.test(excludeId || '')
      ? await database.execute(
          `SELECT active_site_visit_date AS date FROM bookings
          WHERE active_site_visit_date >= ? AND active_site_visit_date < ?
            AND NOT (id = ? AND user_id = ? AND status = 'pending')`,
          [monthStart, nextMonth, excludeId, user.id],
        )
      : await database.execute(
          `SELECT active_site_visit_date AS date FROM bookings
          WHERE active_site_visit_date >= ? AND active_site_visit_date < ?`,
          [monthStart, nextMonth],
        );

    return NextResponse.json({ dates: rows.map((row) => row.date) });
  } catch (error) {
    console.error('Booking availability lookup failed:', error);
    return NextResponse.json({ error: 'ตรวจสอบวันว่างไม่สำเร็จ' }, { status: 500 });
  }
}