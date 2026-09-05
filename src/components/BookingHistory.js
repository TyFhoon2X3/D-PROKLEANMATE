'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const formatDate = (date) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'long' }).format(new Date(`${date}T00:00:00`));

export default function BookingHistory() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadBookings = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace('/login');
        return;
      }

      const { data, error: queryError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (queryError) setError(queryError.message);
      setBookings(data || []);
      setIsLoading(false);
    };

    loadBookings();
  }, [router]);

  return (
    <main className="booking-page account-page">
      <header className="booking-header"><div className="booking-brand"><span className="brand-shield"><span className="brand-roof" /></span><span><strong>ดี-โปร คลีน แมท</strong><small>D-PRO KLEANMATE</small></span></div><Link href="/booking" className="header-back">จองบริการ</Link></header>
      <section className="account-content">
        <h1>รายการจอง</h1>
        <p className="account-subtitle">ประวัติการจองบริการของคุณ</p>
        {isLoading && <div className="empty-account">กำลังโหลดข้อมูล...</div>}
        {!isLoading && error && <div className="empty-account booking-error">{error}</div>}
        {!isLoading && !error && bookings.length === 0 && <div className="empty-account"><strong>ยังไม่มีรายการจอง</strong><span>เริ่มต้นจองบริการทำความสะอาดได้เลย</span><Link href="/booking" className="next-button">จองบริการ</Link></div>}
        <div className="booking-history-list">{bookings.map((booking) => <article className="history-card" key={booking.id}><div className="history-card-top"><div><small>หมายเลขออเดอร์</small><strong>{booking.order_number}</strong></div><span className={`status-badge status-${booking.status}`}>{booking.status === 'pending' ? 'รอการยืนยัน' : booking.status}</span></div><h2>{booking.service_name}</h2><div className="history-meta"><span>📅 {formatDate(booking.service_date)}</span><span>⏰ {booking.time_slot} น.</span></div><p>{booking.service_address}</p><Link href={`/booking/${booking.id}`} className="history-link">ดูรายละเอียด →</Link></article>)}</div>
      </section>
      <AccountNav active="orders" />
    </main>
  );
}

function AccountNav({ active }) {
  return <nav className="booking-nav" aria-label="เมนูหลัก"><Link href="/"><span>⌂</span>หน้าแรก</Link><Link href="/booking"><span>✣</span>จองบริการ</Link><Link href="/bookings" className={active === 'orders' ? 'active' : ''}><span>□</span>รายการจอง</Link><Link href="/profile" className={active === 'profile' ? 'active' : ''}><span>♙</span>โปรไฟล์</Link></nav>;
}