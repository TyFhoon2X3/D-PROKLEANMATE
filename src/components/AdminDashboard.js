'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const statusLabels = { pending: 'รอการยืนยัน', quote: 'ประเมินราคา', awaiting_payment: 'รอชำระเงิน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก' };

export default function AdminDashboard() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '' });
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [isSavingService, setIsSavingService] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [services, setServices] = useState([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');

  useEffect(() => {
    const loadAdminData = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single();
      if (profileError || profile?.role !== 'admin') {
        router.replace('/booking');
        return;
      }

      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (error) setMessage(error.message);
      setBookings(data || []);
      setIsLoading(false);
    };

    loadAdminData();
  }, [router]);

  const filteredBookings = useMemo(() => bookings.filter((booking) => {
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [booking.order_number, booking.customer_name, booking.customer_phone, booking.service_name].some((value) => value?.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  }), [bookings, search, statusFilter]);

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setBookings((currentBookings) => currentBookings.map((booking) => booking.id === id ? { ...booking, status } : booking));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (isLoading) return <main className="auth-status"><p>กำลังโหลดระบบผู้ดูแล...</p></main>;

  const counts = bookings.reduce((summary, booking) => ({ ...summary, [booking.status]: (summary[booking.status] || 0) + 1 }), {});

  return (
    <main className="admin-page">
      <header className="admin-header"><div><span className="admin-kicker">D-PROKLEANMATE</span><h1>ระบบผู้ดูแล</h1></div><div className="admin-header-actions"><Link href="/booking">ไปหน้าจองบริการ</Link><button type="button" onClick={signOut}>ออกจากระบบ</button></div></header>
      <section className="admin-content">
        <div className="admin-welcome"><div><h2>ภาพรวมการจอง</h2><p>จัดการรายการจองและอัปเดตสถานะบริการ</p></div><span className="admin-date">อัปเดตแบบเรียลไทม์</span></div>
        <div className="admin-stat-grid"><StatCard label="รายการทั้งหมด" value={bookings.length} /><StatCard label="รอการยืนยัน" value={counts.pending || 0} accent="pending" /><StatCard label="ยืนยันแล้ว" value={counts.confirmed || 0} accent="confirmed" /><StatCard label="เสร็จสิ้น" value={counts.completed || 0} accent="completed" /></div>
        <div className="admin-toolbar"><input aria-label="ค้นหารายการจอง" placeholder="ค้นหาเลขออเดอร์ ชื่อลูกค้า หรือบริการ" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="กรองสถานะ" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">ทุกสถานะ</option><option value="pending">รอการยืนยัน</option><option value="confirmed">ยืนยันแล้ว</option><option value="completed">เสร็จสิ้น</option><option value="cancelled">ยกเลิก</option></select></div>
        {message && <p className="booking-error">{message}</p>}
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>บริการ</th><th>วันและเวลา</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{filteredBookings.map((booking) => <tr key={booking.id}><td><Link href={`/bookings/${booking.id}`} className="admin-order-link"><strong>{booking.order_number}</strong><small>{new Date(booking.created_at).toLocaleDateString('th-TH')}</small></Link></td><td><strong>{booking.customer_name}</strong><small>{booking.customer_phone}</small></td><td>{booking.service_name}</td><td>{booking.service_date}<small>{booking.time_slot}</small></td><td><span className={`status-badge status-${booking.status}`}>{statusLabels[booking.status] || booking.status}</span></td><td><select className="status-select" value={booking.status} onChange={(event) => updateStatus(booking.id, event.target.value)} aria-label={`เปลี่ยนสถานะ ${booking.order_number}`}><option value="pending">รอการยืนยัน</option><option value="confirmed">ยืนยันแล้ว</option><option value="completed">เสร็จสิ้น</option><option value="cancelled">ยกเลิก</option></select></td></tr>)}</tbody></table>{filteredBookings.length === 0 && <div className="admin-empty">ไม่พบรายการจอง</div>}</div>
      </section>
    </main>
  );
}

function StatCard({ label, value, accent = '' }) {
  return <div className={`admin-stat-card ${accent}`}><span>{label}</span><strong>{value}</strong></div>;
}