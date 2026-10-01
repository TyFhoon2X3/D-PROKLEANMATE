import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';

const storageDirectory = path.join(process.cwd(), 'storage', 'payment-slips');
const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

async function findAccessibleBooking(id, user) {
  const database = getDatabase();
  const [rows] = user.role === 'admin'
    ? await database.execute('SELECT id, user_id, status, payment_slip_url FROM bookings WHERE id = ?', [id])
    : await database.execute('SELECT id, user_id, status, payment_slip_url FROM bookings WHERE id = ? AND user_id = ?', [id, user.id]);
  return rows[0] || null;
}

export async function POST(request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'ไม่พบรายการจองนี้' }, { status: 404 });
    const booking = await findAccessibleBooking(id, user);
    if (!booking) return NextResponse.json({ error: 'ไม่พบรายการจองนี้' }, { status: 404 });
    if (booking.status !== 'awaiting_payment') return NextResponse.json({ error: 'รายการนี้ยังไม่อยู่ในขั้นตอนชำระเงิน' }, { status: 409 });

    const formData = await request.formData();
    const file = formData.get('file');
    const extension = allowedTypes.get(file?.type);
    if (!file || !extension || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'รองรับเฉพาะรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB' }, { status: 400 });
    }

    await mkdir(storageDirectory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(storageDirectory, filename), Buffer.from(await file.arrayBuffer()), { flag: 'wx' });
    try {
      await getDatabase().execute('UPDATE bookings SET payment_slip_url = ? WHERE id = ?', [filename, id]);
    } catch (error) {
      await rm(path.join(storageDirectory, filename), { force: true });
      throw error;
    }
    if (booking.payment_slip_url && /^[a-f0-9-]+\.(jpg|png|webp)$/.test(booking.payment_slip_url)) {
      await rm(path.join(storageDirectory, booking.payment_slip_url), { force: true });
    }
    return NextResponse.json({ payment_slip_url: filename });
  } catch (error) {
    console.error('Payment slip upload failed:', error);
    return NextResponse.json({ error: 'อัปโหลดสลิปไม่สำเร็จ' }, { status: 500 });
  }
}

export async function GET(_request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    const { id } = await params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'ไม่พบไฟล์สลิปนี้' }, { status: 404 });
    const booking = await findAccessibleBooking(id, user);
    if (!booking?.payment_slip_url || !/^[a-f0-9-]+\.(jpg|png|webp)$/.test(booking.payment_slip_url)) {
      return NextResponse.json({ error: 'ไม่พบไฟล์สลิปนี้' }, { status: 404 });
    }

    const file = await readFile(path.join(storageDirectory, booking.payment_slip_url));
    const contentType = booking.payment_slip_url.endsWith('.png')
      ? 'image/png'
      : booking.payment_slip_url.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error.code === 'ENOENT') return NextResponse.json({ error: 'ไม่พบไฟล์สลิปนี้' }, { status: 404 });
    console.error('Payment slip download failed:', error);
    return NextResponse.json({ error: 'โหลดสลิปไม่สำเร็จ' }, { status: 500 });
  }
}