import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    const database = getDatabase();
    const [bookings] = await database.execute(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC',
      [user.id],
    );
    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Bookings lookup failed:', error);
    return NextResponse.json({ error: 'โหลดรายการจองไม่สำเร็จ' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });

    const body = await request.json();
    const customerName = String(body.customer_name || '').trim();
    const customerPhone = String(body.customer_phone || '').trim();
    const serviceAddress = String(body.service_address || '').trim();
    const siteVisitDate = String(body.site_visit_date || '');
    const paymentMethod = body.payment_method;
    if (!customerName || !customerPhone || !serviceAddress || !/^\d{4}-\d{2}-\d{2}$/.test(siteVisitDate)) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลการจองให้ครบถ้วน' }, { status: 400 });
    }
    if (!['qr', 'cash'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'วิธีชำระเงินไม่ถูกต้อง' }, { status: 400 });
    }

    const database = getDatabase();
    const [services] = await database.execute(
      'SELECT name, starting_price, price FROM services WHERE name = ? AND is_active = TRUE',
      [String(body.service_name || '')],
    );
    if (!services.length) return NextResponse.json({ error: 'ไม่พบบริการที่เลือก' }, { status: 400 });
    const [[{ today }]] = await database.query('SELECT CURRENT_DATE() AS today');
    if (siteVisitDate < today) return NextResponse.json({ error: 'ไม่สามารถจองย้อนหลังได้' }, { status: 400 });

    const service = services[0];
    const orderNumber = `DP${Date.now()}${randomInt(1000, 10000)}`;
    const [result] = await database.execute(
      `INSERT INTO bookings
        (order_number, user_id, service_name, service_price, site_visit_date, customer_name, customer_phone, customer_email, service_address, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderNumber, user.id, service.name, service.starting_price || service.price, siteVisitDate, customerName, customerPhone, String(body.customer_email || user.email).trim() || null, serviceAddress, paymentMethod],
    );
    return NextResponse.json({ id: result.insertId, order_number: orderNumber }, { status: 201 });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'วันที่เข้าประเมินสถานที่นี้มีผู้จองแล้ว กรุณาเลือกวันอื่น' }, { status: 409 });
    }
    console.error('Booking creation failed:', error);
    return NextResponse.json({ error: 'บันทึกการจองไม่สำเร็จ' }, { status: 500 });
  }
}