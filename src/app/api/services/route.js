import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mysql';

export async function GET() {
  try {
    const database = getDatabase();
    const [services] = await database.execute(
      'SELECT id, name, starting_price, price FROM services WHERE is_active = TRUE ORDER BY sort_order, created_at',
    );
    return NextResponse.json({ services });
  } catch (error) {
    console.error('Services lookup failed:', error);
    return NextResponse.json({ error: 'โหลดรายการบริการไม่สำเร็จ' }, { status: 500 });
  }
}