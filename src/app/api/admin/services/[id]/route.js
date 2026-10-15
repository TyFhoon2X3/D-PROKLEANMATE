import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';
import { getServiceImageUrl, parseServiceImage } from '@/lib/service-images';

export async function PATCH(request, { params }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
    if (user.role !== 'admin') return NextResponse.json({ error: 'ไม่มีสิทธิ์ดำเนินการ' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const allowedFields = ['name', 'price', 'starting_price', 'is_active'];
    const entries = Object.entries(body).filter(([field]) => allowedFields.includes(field));
    if (Object.hasOwn(body, 'image_data')) {
      const image = parseServiceImage(body.image_data);
      if (!image)
        return NextResponse.json(
          { error: 'รูปต้องเป็น JPEG, PNG หรือ WebP และมีขนาดไม่เกิน 1 MB' },
          { status: 400 },
        );
      entries.push(['image_data', image.imageData], ['image_mime_type', image.mimeType]);
    }
    if (!entries.length) return NextResponse.json({ error: 'ไม่มีข้อมูลที่แก้ไขได้' }, { status: 400 });
    const assignments = entries.map(([field]) => `\`${field}\` = ?`).join(', ');
    const [result] = await getDatabase().execute(
      `UPDATE services SET ${assignments} WHERE id = ?`,
      [...entries.map(([, value]) => value), id],
    );
    if (!result.affectedRows) return NextResponse.json({ error: 'ไม่พบบริการนี้' }, { status: 404 });
    const [rows] = await getDatabase().execute(
      'SELECT id, name, starting_price, price, is_active, sort_order, created_at, image_data IS NOT NULL AS has_image FROM services WHERE id = ?',
      [id],
    );
    return NextResponse.json({
      service: {
        ...rows[0],
        image_url: getServiceImageUrl(rows[0].id, rows[0].has_image),
      },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return NextResponse.json({ error: 'มีบริการชื่อนี้แล้ว' }, { status: 409 });
    console.error('Service update failed:', error);
    return NextResponse.json({ error: 'แก้ไขบริการไม่สำเร็จ' }, { status: 500 });
  }
}