import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mysql';

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    if (!/^\d+$/.test(id)) return new NextResponse(null, { status: 404 });

    const [rows] = await getDatabase().execute(
      'SELECT image_data, image_mime_type FROM services WHERE id = ? AND image_data IS NOT NULL',
      [id],
    );
    if (!rows.length) return new NextResponse(null, { status: 404 });

    return new NextResponse(rows[0].image_data, {
      headers: {
        'Content-Type': rows[0].image_mime_type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Service image lookup failed:', error);
    return new NextResponse(null, { status: 500 });
  }
}