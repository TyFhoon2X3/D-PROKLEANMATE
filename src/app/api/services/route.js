import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mysql';
import { getServiceImageUrl } from '@/lib/service-images';

export async function GET() {
  try {
    const database = getDatabase();
    const [services] = await database.execute(
      'SELECT id, name, starting_price, price, image_data IS NOT NULL AS has_image FROM services WHERE is_active = TRUE ORDER BY sort_order, created_at',
    );
    return NextResponse.json({
      services: services.map((service) => ({
        ...service,
        image_url: getServiceImageUrl(service.id, service.has_image),
      })),
    });
  } catch (error) {
    console.error('Services lookup failed:', error);
    return NextResponse.json({ error: 'โหลดรายการบริการไม่สำเร็จ' }, { status: 500 });
  }
}