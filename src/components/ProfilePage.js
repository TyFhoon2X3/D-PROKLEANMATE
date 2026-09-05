'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setUser(data.user);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      setIsAdmin(profile?.role === 'admin');
      setIsLoading(false);
    };
    loadUser();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (isLoading) return <main className="auth-status"><p>กำลังโหลดโปรไฟล์...</p></main>;

  const metadata = user.user_metadata || {};
  const displayName = metadata.full_name || metadata.name || user.email?.split('@')[0] || 'ผู้ใช้งาน';

  return <main className="booking-page account-page"><header className="booking-header"><div className="booking-brand"><span className="brand-shield"><span className="brand-roof" /></span><span><strong>ดี-โปร คลีน แมท</strong><small>D-PRO KLEANMATE</small></span></div><Link href="/booking" className="header-back">จองบริการ</Link></header><section className="account-content"><h1>โปรไฟล์</h1><p className="account-subtitle">ข้อมูลบัญชีของคุณ</p><div className="profile-card"><div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div><h2>{displayName}</h2><p>{user.email}</p><div className="profile-fields"><div><small>ชื่อผู้ใช้งาน</small><strong>{metadata.username || '-'}</strong></div><div><small>เบอร์โทรศัพท์</small><strong>{metadata.phone || '-'}</strong></div><div><small>สมาชิกตั้งแต่</small><strong>{new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(user.created_at))}</strong></div></div></div>{isAdmin && <Link href="/admin" className="admin-entry-button">เข้าสู่ระบบ Admin</Link>}<button type="button" className="signout-button" onClick={signOut}>ออกจากระบบ</button></section><AccountNav active="profile" /></main>;
}

function AccountNav({ active }) {
  return <nav className="booking-nav" aria-label="เมนูหลัก"><Link href="/"><span>⌂</span>หน้าแรก</Link><Link href="/booking"><span>✣</span>จองบริการ</Link><Link href="/bookings" className={active === 'orders' ? 'active' : ''}><span>□</span>รายการจอง</Link><Link href="/profile" className={active === 'profile' ? 'active' : ''}><span>♙</span>โปรไฟล์</Link></nav>;
}