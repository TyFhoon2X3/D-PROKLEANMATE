'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const statusLabels = { pending: 'รอการยืนยัน', confirmed: 'ยืนยันแล้ว', completed: 'เสร็จสิ้น', cancelled: 'ยกเลิก' };

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

      const [{ data: bookingData, error: bookingError }, { data: serviceData, error: serviceError }] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('services').select('*').order('sort_order').order('created_at'),
      ]);
      if (bookingError) setMessage(bookingError.message);
      if (serviceError) setMessage(serviceError.message.includes('services') ? 'ยังไม่มีตาราง services ใน Supabase กรุณารัน SQL schema ที่ให้ไว้ใน supabase/schema.sql' : serviceError.message);
      setBookings(bookingData || []);
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

  const saveService = async (event) => {
    event.preventDefault();
    if (!serviceForm.name.trim() || !serviceForm.price.trim()) return;

    setIsSavingService(true);
    const serviceData = { name: serviceForm.name.trim(), price: serviceForm.price.trim() };
    const query = editingServiceId
      ? supabase.from('services').update(serviceData).eq('id', editingServiceId).select().single()
      : supabase.from('services').insert({ ...serviceData, sort_order: services.length }).select().single();
    const { data, error } = await query;
    setIsSavingService(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setServices((currentServices) => editingServiceId
      ? currentServices.map((service) => service.id === editingServiceId ? data : service)
      : [...currentServices, data]);
    setServiceForm({ name: '', price: '' });
    setEditingServiceId(null);
    setMessage(editingServiceId ? 'แก้ไขบริการเรียบร้อยแล้ว' : 'เพิ่มบริการเรียบร้อยแล้ว');
  };

  const editService = (service) => {
    setEditingServiceId(service.id);
    setServiceForm({ name: service.name, price: service.price });
    setMessage('');
  };

  const cancelEditingService = () => {
    setEditingServiceId(null);
    setServiceForm({ name: '', price: '' });
  };

  const toggleService = async (service) => {
    const { data, error } = await supabase.from('services').update({ is_active: !service.is_active }).eq('id', service.id).select().single();
    if (error) {
      setMessage(error.message);
      return;
    }
    setServices((currentServices) => currentServices.map((currentService) => currentService.id === service.id ? data : currentService));
  };

  const deleteService = async (service) => {
    if (!window.confirm(`ต้องการลบบริการ "${service.name}" ใช่หรือไม่?`)) return;

    const { error } = await supabase.from('services').delete().eq('id', service.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setServices((currentServices) => currentServices.filter((currentService) => currentService.id !== service.id));
    if (editingServiceId === service.id) cancelEditingService();
    setMessage('ลบบริการเรียบร้อยแล้ว');
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
        <section className="admin-services">
          <div className="admin-section-heading"><div><h2>บริการ</h2><p>เพิ่มบริการใหม่เพื่อให้ลูกค้าเลือกในหน้าจอง</p></div></div>
          <form className="service-form" onSubmit={saveService}>
            <input aria-label="ชื่อบริการ" placeholder="ชื่อบริการ" value={serviceForm.name} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} />
            <input aria-label="รายละเอียดราคา" placeholder="เช่น เริ่มต้น 45 บาท/ตร.ม." value={serviceForm.price} onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })} />
            <button type="submit" disabled={isSavingService}>{isSavingService ? 'กำลังบันทึก...' : editingServiceId ? 'บันทึกการแก้ไข' : 'เพิ่มบริการ'}</button>
            {editingServiceId && <button type="button" className="service-cancel-button" onClick={cancelEditingService}>ยกเลิก</button>}
          </form>
          <div className="service-admin-list">{services.map((service) => <div className="service-admin-item" key={service.id}><div className="service-admin-details"><strong>{service.name}</strong><span>{service.price}</span></div><div className="service-admin-actions"><span className={`service-active-label ${service.is_active ? 'active' : ''}`}>{service.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span><button type="button" onClick={() => editService(service)}>แก้ไข</button><button type="button" onClick={() => toggleService(service)}>{service.is_active ? 'ปิด' : 'เปิด'}</button><button type="button" className="service-delete-button" onClick={() => deleteService(service)}>ลบ</button></div></div>)}{services.length === 0 && <p className="admin-empty">ยังไม่มีบริการ</p>}</div>
        </section>
        <div className="admin-toolbar"><input aria-label="ค้นหารายการจอง" placeholder="ค้นหาเลขออเดอร์ ชื่อลูกค้า หรือบริการ" value={search} onChange={(event) => setSearch(event.target.value)} /><select aria-label="กรองสถานะ" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">ทุกสถานะ</option><option value="pending">รอการยืนยัน</option><option value="confirmed">ยืนยันแล้ว</option><option value="completed">เสร็จสิ้น</option><option value="cancelled">ยกเลิก</option></select></div>
        {message && <p className="booking-error">{message}</p>}
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ออเดอร์</th><th>ลูกค้า</th><th>บริการ</th><th>วันและเวลา</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{filteredBookings.map((booking) => <tr key={booking.id}><td data-label="ออเดอร์"><Link href={`/bookings/${booking.id}`} className="admin-order-link"><strong>{booking.order_number}</strong><small>{new Date(booking.created_at).toLocaleDateString('th-TH')}</small></Link></td><td data-label="ลูกค้า"><strong>{booking.customer_name}</strong><small>{booking.customer_phone}</small></td><td data-label="บริการ">{booking.service_name}</td><td data-label="วันและเวลา">{booking.service_date}<small>{booking.time_slot}</small></td><td data-label="สถานะ"><span className={`status-badge status-${booking.status}`}>{statusLabels[booking.status] || booking.status}</span></td><td data-label="จัดการ"><select className="status-select" value={booking.status} onChange={(event) => updateStatus(booking.id, event.target.value)} aria-label={`เปลี่ยนสถานะ ${booking.order_number}`}><option value="pending">รอการยืนยัน</option><option value="confirmed">ยืนยันแล้ว</option><option value="completed">เสร็จสิ้น</option><option value="cancelled">ยกเลิก</option></select></td></tr>)}</tbody></table>{filteredBookings.length === 0 && <div className="admin-empty">ไม่พบรายการจอง</div>}</div>
      </section>
    </main>
  );
}

function StatCard({ label, value, accent = '' }) {
  return <div className={`admin-stat-card ${accent}`}><span>{label}</span><strong>{value}</strong></div>;
}