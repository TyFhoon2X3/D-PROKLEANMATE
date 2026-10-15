import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabase } from '@/lib/mysql';

async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { response: NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 }) };
  if (user.role !== 'admin') return { response: NextResponse.json({ error: 'ไม่มีสิทธิ์ดำเนินการ' }, { status: 403 }) };
  return { user };
}

export async function GET() {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const database = getDatabase();
    const [users] = await database.execute(
      `SELECT u.id, u.email, u.username, u.full_name, u.phone, u.role, u.created_at,
        COUNT(b.id) AS booking_count
      FROM users u
      LEFT JOIN bookings b ON b.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC`,
    );
    return NextResponse.json({ users: users.map((user) => ({ ...user, booking_count: Number(user.booking_count) })) });
  } catch (error) {
    console.error('Admin users lookup failed:', error);
    return NextResponse.json({ error: 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ' }, { status: 500 });
  }
}

export async function PATCH(request) {
  let connection;
  try {
    const { user, response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    const userId = Number(body.userId);
    const role = String(body.role || '');
    if (!Number.isSafeInteger(userId) || userId < 1 || !['user', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'ข้อมูลสิทธิ์ผู้ใช้ไม่ถูกต้อง' }, { status: 400 });
    }
    if (userId === Number(user.id) && role !== user.role) {
      return NextResponse.json({ error: 'ไม่สามารถเปลี่ยนสิทธิ์บัญชีที่กำลังใช้งานได้' }, { status: 400 });
    }

    connection = await getDatabase().getConnection();
    await connection.beginTransaction();
    const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin' FOR UPDATE");
    const [targetUsers] = await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!targetUsers.length) {
      await connection.rollback();
      return NextResponse.json({ error: 'ไม่พบบัญชีผู้ใช้' }, { status: 404 });
    }
    if (role === 'user' && admins.length <= 1) {
      await connection.rollback();
      return NextResponse.json({ error: 'ระบบต้องมีผู้ดูแลอย่างน้อยหนึ่งบัญชี' }, { status: 409 });
    }

    await connection.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    await connection.commit();
    return NextResponse.json({ userId, role });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Admin user role update failed:', error);
    return NextResponse.json({ error: 'เปลี่ยนสิทธิ์ผู้ใช้ไม่สำเร็จ' }, { status: 500 });
  } finally {
    connection?.release();
  }
}