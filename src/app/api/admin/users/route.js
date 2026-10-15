import { NextResponse } from 'next/server';
import { getSessionUser, hashPassword } from '@/lib/auth';
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

export async function POST(request) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const username = String(body.username || '').trim();
    const fullName = String(body.fullName || '').trim();
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');

    if (!fullName || !phone || !username) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อ-นามสกุล เบอร์โทรศัพท์ และชื่อผู้ใช้งานให้ครบถ้วน' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      return NextResponse.json({ error: 'กรุณาตรวจสอบอีเมลและรหัสผ่าน (อย่างน้อย 6 ตัวอักษร)' }, { status: 400 });
    }

    const database = getDatabase();
    const [result] = await database.execute(
      'INSERT INTO users (email, password_hash, username, full_name, phone) VALUES (?, ?, ?, ?, ?)',
      [email, hashPassword(password), username, fullName, phone],
    );

    return NextResponse.json({
      user: {
        id: Number(result.insertId),
        email,
        username,
        full_name: fullName,
        phone,
        role: 'user',
        created_at: new Date(),
      },
    }, { status: 201 });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'อีเมลนี้มีบัญชีอยู่แล้ว' }, { status: 409 });
    }
    console.error('Admin user creation failed:', error);
    return NextResponse.json({ error: 'เพิ่มสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }, { status: 500 });
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