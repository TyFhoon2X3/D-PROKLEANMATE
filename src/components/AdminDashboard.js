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
      const { data: serviceData } = await supabase.from('services').select('*').order('created_at');
      if (error) setMessage(error.message);
      setBookings(data || []);
      setServices(serviceData || []);
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

  const updateField = async (id, field, value) => {
    const { error } = await supabase.from('bookings').update({ [field]: value || null }).eq('id', id);
    if (error) {
      setMessage(error.code === '23505' ? 'วันที่เข้าประเมินสถานที่นี้มีรายการจองแล้ว' : error.message);
      return;
    }
    setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, [field]: value || null } : booking));
  };

  const addService = async (event) => {
    event.preventDefault();
    if (!newServiceName.trim() || !newServicePrice.trim()) return setMessage('กรุณากรอกชื่อบริการและราคา');
    const price = newServicePrice.trim();
    const { data, error } = await supabase.from('services').insert({ name: newServiceName.trim(), price, starting_price: price }).select().single();
    if (error) return setMessage(error.message);
    setServices((current) => [...current, data]);
    setNewServiceName('');
    setNewServicePrice('');
  };

  const updateService = async (id, changes) => {
    const { error } = await supabase.from('services').update(changes).eq('id', id);
    if (error) return setMessage(error.message);
    setServices((current) => current.map((service) => service.id === id ? { ...service, ...changes } : service));
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
        <div className="admin-stat-grid"><StatCard label="รายการทั้งหมด" value={bookings.length} /><StatCard label="ประเมินราคา" value={counts.quote || 0} accent="quote" /><StatCard label="รอชำระเงิน" value={counts.awaiting_payment || 0} accent="payment" /><StatCard label="ยืนยันแล้ว" value={counts.confirmed || 0} accent="confirmed" /></div>
        <div className="admin-toolbar"><input aria-label="ค้นหารายการจอง" placeholder="ค้นหาเลขออเดอร์ ชื่อลูกค้า หรือบริการ" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="กรองสถานะ" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">ทุกสถานะ</option><option value="pending">รอการยืนยัน</option><option value="confirmed">ยืนยันแล้ว</option><option value="completed">เสร็จสิ้น</option><option value="cancelled">ยกเลิก</option></select></div>
        {message && <p className="booking-error">{message}</p>}
        <section className="admin-services"><h2>จัดการบริการ</h2><form className="admin-service-form" onSubmit={addService}><input placeholder="ชื่อบริการใหม่" value={newServiceName} onChange={(event) => setNewServiceName(event.target.value)} /><input placeholder="ราคาเริ่มต้น" value={newServicePrice} onChange={(event) => setNewServicePrice(event.target.value)} /><button type="submit">เพิ่มบริการ</button></form>{services.map((service) => <div className="admin-service-row" key={service.id}><input defaultValue={service.name} onBlur={(event) => updateService(service.id, { name: event.target.value.trim() })} /><input defaultValue={service.starting_price || service.price || ''} onBlur={(event) => { const price = event.target.value.trim(); updateService(service.id, { price, starting_price: price }); }} /><label><input type="checkbox" checked={service.is_active} onChange={(event) => updateService(service.id, { is_active: event.target.checked })} /> เปิดใช้งาน</label></div>)}</section>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>บริการ</th><th>วันเข้าประเมิน</th><th>วันทำความสะอาด</th><th>ราคา</th><th>ชำระเงิน</th><th>สลิป</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{filteredBookings.map((booking) => <tr key={booking.id}><td><Link href={`/bookings/${booking.id}`} className="admin-order-link"><strong>{booking.order_number}</strong><small>{new Date(booking.created_at).toLocaleDateString('th-TH')}</small></Link></td><td><strong>{booking.customer_name}</strong><small>{booking.customer_phone}</small></td><td>{booking.service_name}</td><td>{booking.site_visit_date || '-'}</td><td><input className="admin-date-input" type="date" defaultValue={booking.service_date || ''} onBlur={(event) => updateField(booking.id, 'service_date', event.target.value)} /></td><td><input className="admin-price-input" type="number" min="0" step="0.01" defaultValue={booking.admin_price ?? ''} onBlur={(event) => updateField(booking.id, 'admin_price', event.target.value)} /></td><td>{booking.payment_method === 'cash' ? 'เงินสด' : 'QR Code'}</td><td>{booking.payment_slip_url ? <a href={booking.payment_slip_url} target="_blank" rel="noreferrer">ดูสลิป</a> : 'ยังไม่มี'}</td><td><span className={`status-badge status-${booking.status}`}>{statusLabels[booking.status] || booking.status}</span></td><td><select className="status-select" value={booking.status} onChange={(event) => updateStatus(booking.id, event.target.value)} aria-label={`เปลี่ยนสถานะ ${booking.order_number}`}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></td></tr>)}</tbody></table>{filteredBookings.length === 0 && <div className="admin-empty">ไม่พบรายการจอง</div>}</div>
      </section>
    </main>
  );
}

function StatCard({ label, value, accent = '' }) {
  return <div className={`admin-stat-card ${accent}`}><span>{label}</span><strong>{value}</strong></div>;
}