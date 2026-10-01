import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Session lookup failed:', error);
    return NextResponse.json({ error: 'ตรวจสอบ session ไม่สำเร็จ' }, { status: 500 });
  }
}