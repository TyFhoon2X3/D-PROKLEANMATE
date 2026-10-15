'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const statusLabels = { pending: 'รอการยืนยัน', quote: 'ประเมินราคา', awaiting_payment: 'รอชำระเงิน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก' };

export default function AdminUsers() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRoleUserId, setPendingRoleUserId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadUsers = async () => {
      const sessionResponse = await fetch('/api/auth/me');
      const { user } = await sessionResponse.json();
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.role !== 'admin') {
        router.replace('/booking');
        return;
      }
      setCurrentUser(user);

      const response = await fetch('/api/admin/users');
      const result = await response.json();
      if (!response.ok) setMessage(result.error || 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
      setUsers(result.users || []);
      setIsLoading(false);
    };

    loadUsers();
  }, [router]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.full_name, user.username, user.email, user.phone].some((value) => value?.toLowerCase().includes(query)));
  }, [users, search]);

  const openDetails = async (userId) => {
    setMessage('');
    const response = await fetch(`/api/admin/users/${userId}`);
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || 'โหลดรายละเอียดผู้ใช้ไม่สำเร็จ');
      return;
    }
    setSelectedUser(result);
  };

  const updateRole = async (userId, role) => {
    const label = role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป';
    if (!window.confirm(`ยืนยันการเปลี่ยนสิทธิ์บัญชีนี้เป็น${label}หรือไม่`)) return;

    setPendingRoleUserId(userId);
    setMessage('');
    const response = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || 'เปลี่ยนสิทธิ์ผู้ใช้ไม่สำเร็จ');
    } else {
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, role } : user));
      if (selectedUser?.user.id === userId) {
        setSelectedUser((current) => ({ ...current, user: { ...current.user, role } }));
      }
    }
    setPendingRoleUserId(null);
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  };

  if (isLoading) return <main className="auth-status"><p>กำลังโหลดรายชื่อผู้ใช้...</p></main>;

  return (
    <main className="admin-page">
      <header className="admin-header"><div><span className="admin-kicker">D-PROKLEANMATE</span><h1>จัดการผู้ใช้</h1></div><div className="admin-header-actions"><Link href="/admin">กลับระบบผู้ดูแล</Link><button type="button" onClick={signOut}>ออกจากระบบ</button></div></header>
      <section className="admin-content">
        <div className="admin-welcome"><div><h2>บัญชีผู้ใช้</h2><p>ดูข้อมูลติดต่อ ประวัติการจอง และกำหนดสิทธิ์บัญชี</p></div><span className="admin-date">ทั้งหมด {users.length} บัญชี</span></div>
        <div className="admin-users-toolbar"><input aria-label="ค้นหาผู้ใช้" placeholder="ค้นหาชื่อ อีเมล หรือเบอร์โทรศัพท์" value={search} onChange={(event) => setSearch(event.target.value)} /><span>{filteredUsers.length} รายการ</span></div>
        {message && <p className="booking-error" role="alert">{message}</p>}
        <div className="admin-table-wrap">
          <table className="admin-table admin-users-table">
            <thead><tr><th>ผู้ใช้</th><th>อีเมล</th><th>เบอร์โทรศัพท์</th><th>วันที่สมัคร</th><th>รายการจอง</th><th>สิทธิ์</th><th>รายละเอียด</th></tr></thead>
            <tbody>{filteredUsers.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.full_name || user.username || 'ไม่ระบุชื่อ'}</strong><small>@{user.username || '-'}</small></td>
                <td>{user.email}</td>
                <td>{user.phone || '-'}</td>
                <td>{new Date(user.created_at).toLocaleDateString('th-TH')}</td>
                <td>{user.booking_count}</td>
                <td><select aria-label={`กำหนดสิทธิ์ ${user.full_name || user.email}`} value={user.role} disabled={user.id === currentUser?.id || pendingRoleUserId === user.id} onChange={(event) => updateRole(user.id, event.target.value)}><option value="user">ผู้ใช้ทั่วไป</option><option value="admin">ผู้ดูแลระบบ</option></select></td>
                <td><button className="admin-user-detail-button" type="button" onClick={() => openDetails(user.id)}>ดูรายละเอียด</button></td>
              </tr>
            ))}</tbody>
          </table>
          {filteredUsers.length === 0 && <div className="admin-empty">ไม่พบบัญชีผู้ใช้</div>}
        </div>
      </section>

      {selectedUser && <div className="admin-user-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}>
        <section className="admin-user-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-user-dialog-title">
          <header><div><span className="admin-kicker">รายละเอียดบัญชี</span><h2 id="admin-user-dialog-title">{selectedUser.user.full_name || selectedUser.user.username || 'ผู้ใช้'}</h2></div><button type="button" aria-label="ปิดรายละเอียด" onClick={() => setSelectedUser(null)}>ปิด</button></header>
          <dl className="admin-user-profile"><div><dt>ชื่อผู้ใช้</dt><dd>{selectedUser.user.username || '-'}</dd></div><div><dt>อีเมล</dt><dd>{selectedUser.user.email}</dd></div><div><dt>เบอร์โทรศัพท์</dt><dd>{selectedUser.user.phone || '-'}</dd></div><div><dt>วันที่สมัคร</dt><dd>{new Date(selectedUser.user.created_at).toLocaleDateString('th-TH')}</dd></div><div><dt>สิทธิ์</dt><dd>{selectedUser.user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้ทั่วไป'}</dd></div></dl>
          <div className="admin-user-bookings-heading"><h3>ประวัติการจอง</h3><span>{selectedUser.bookings.length} รายการ</span></div>
          <div className="admin-user-bookings">{selectedUser.bookings.length ? selectedUser.bookings.map((booking) => <article key={booking.order_number}><div><strong>{booking.order_number}</strong><small>{booking.service_name}</small></div><div><span className={`status-badge status-${booking.status}`}>{statusLabels[booking.status] || booking.status}</span><small>{new Date(booking.created_at).toLocaleDateString('th-TH')}</small></div></article>) : <p className="admin-empty">ยังไม่มีประวัติการจอง</p>}</div>
        </section>
      </div>}
    </main>
  );
}