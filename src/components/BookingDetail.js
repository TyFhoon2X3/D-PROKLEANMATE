'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function BookingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
      const admin = profile?.role === 'admin';
      setIsAdmin(admin);
      let bookingQuery = supabase.from('bookings').select('*').eq('id', id);
      if (!admin) bookingQuery = bookingQuery.eq('user_id', userData.user.id);
      const { data, error: queryError } = await bookingQuery.single();
      if (queryError) setError('ไม่พบรายการจองนี้');
      setBooking(data);
    };
    if (id) loadBooking();
  }, [id, router]);

  if (error) return <main className="auth-status"><div><p>{error}</p><Link href={isAdmin ? '/admin' : '/bookings'} className="back-login">กลับไปหน้ารายการ</Link></div></main>;
  if (!booking) return <main className="auth-status"><p>กำลังโหลดรายละเอียด...</p></main>;

  const cancelBooking = async () => {
    if (!window.confirm('ต้องการยกเลิกรายการจองนี้หรือไม่?')) return;
    setIsCancelling(true);
    const { error: cancelError } = await supabase.from('bookings').delete().eq('id', booking.id).eq('status', 'pending');
    if (cancelError) setError(cancelError.message);
    else router.replace(isAdmin ? '/admin' : '/bookings');
    setIsCancelling(false);
  };

  return <main className="booking-page account-page"><header className="booking-header"><div className="booking-brand"><span className="brand-shield"><span className="brand-roof" /></span><span><strong>ดี-โปร คลีน แมท</strong><small>D-PRO KLEANMATE</small></span></div><Link href={isAdmin ? '/admin' : '/bookings'} className="header-back">{isAdmin ? 'Admin' : 'รายการจอง'}</Link></header><section className="account-content"><Link href={isAdmin ? '/admin' : '/bookings'} className="back-step">← ย้อนกลับ</Link><h1>รายละเอียดการจอง</h1><p className="account-subtitle">หมายเลขออเดอร์ {booking.order_number}</p><article className="detail-card"><div className="history-card-top"><strong>{booking.service_name}</strong><span className={`status-badge status-${booking.status}`}>{booking.status === 'pending' ? 'รอการยืนยัน' : booking.status}</span></div><div className="booking-details-grid"><div><small>วันที่ใช้บริการ</small><strong>{booking.service_date}</strong></div><div><small>ช่วงเวลา</small><strong>{booking.time_slot} น.</strong></div><div><small>ชื่อผู้จอง</small><strong>{booking.customer_name}</strong></div><div><small>เบอร์โทรศัพท์</small><strong>{booking.customer_phone}</strong></div><div className="full-detail"><small>อีเมล</small><strong>{booking.customer_email || '-'}</strong></div><div className="full-detail"><small>ที่อยู่ให้บริการ</small><strong>{booking.service_address}</strong></div></div></article>{!isAdmin && booking.status === 'pending' && <button type="button" className="cancel-detail-button" disabled={isCancelling} onClick={cancelBooking}>{isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิกการจอง'}</button>}</section></main>;
}