import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'ไม่มีสิทธิ์ดำเนินการ' }, { status: 403 });
    const database = getDatabase();
    const [bookings] = await database.execute('SELECT * FROM bookings ORDER BY created_at DESC');
    return NextResponse.json({
      bookings: bookings.map((booking) => ({
        ...booking,
        payment_slip_url: booking.payment_slip_url ? `/api/bookings/${booking.id}/slip` : null,
      })),
    });
  } catch (error) {
    console.error('Admin bookings lookup failed:', error);
    return NextResponse.json({ error: 'โหลดรายการจองไม่สำเร็จ' }, { status: 500 });
  }
}