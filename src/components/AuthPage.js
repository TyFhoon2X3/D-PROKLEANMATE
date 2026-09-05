'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthPage({ initialMode = 'login', initialRecovery = false }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isCheckingSession, setIsCheckingSession] = useState(!initialRecovery);
  const router = useRouter();

  const isRegistering = initialMode === 'register';
  const recoveryMode = initialRecovery;

  useEffect(() => {
    if (recoveryMode) return;

    const redirectAuthenticatedUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/booking');
        return;
      }
      setIsCheckingSession(false);
    };

    redirectAuthenticatedUser();
  }, [recoveryMode, router]);

  const getAuthErrorMessage = (error) => {
    if (error?.code === 'validation_failed' && error?.message?.includes('provider is not enabled')) {
      return 'ยังไม่ได้เปิด Google Login ใน Supabase Dashboard กรุณาเปิด Authentication > Providers > Google';
    }
    if (error?.code === 'invalid_credentials' || error?.message === 'Invalid login credentials') {
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หากยังไม่มีบัญชีให้สมัครสมาชิกก่อน';
    }
    if (error?.code === 'email_not_confirmed' || error?.message === 'Email not confirmed') {
      return 'กรุณายืนยันอีเมลจากข้อความที่ส่งไปก่อนเข้าสู่ระบบ';
    }
    if (error?.code === 'user_already_exists') {
      return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ';
    }
    return error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (!email || (!recoveryMode && !password)) {
      setMessage({ type: 'error', text: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' });
      return;
    }

    if (recoveryMode) {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      setMessage(error ? { type: 'error', text: getAuthErrorMessage(error) } : { type: 'success', text: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว' });
      setIsLoading(false);
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }

    setIsLoading(true);
    const result = isRegistering
      ? await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: fullName, phone, username } } })
      : await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });

    if (result.error) {
      setMessage({ type: 'error', text: getAuthErrorMessage(result.error) });
    } else if (isRegistering) {
      setMessage({ type: 'success', text: 'สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี' });
    } else {
      router.push('/booking');
    }
    setIsLoading(false);
  };

  if (isCheckingSession) {
    return <main className="auth-status"><p>กำลังตรวจสอบบัญชี...</p></main>;
  }

  return (
    <main className={`auth-page ${isRegistering ? 'register-mode' : 'login-mode'} ${recoveryMode ? 'recovery-mode' : ''}`}>
      <section className="auth-intro" aria-label="เกี่ยวกับ ProKleanMate">
        <div className="brand-logo" aria-hidden="true"><span className="brand-shield"><span className="brand-roof" /></span><span className="brand-name">D-PROKLEANMATE</span></div>
        <p className="eyebrow">D-PROKLEANMATE</p>
        <h1>จัดการงานทำความสะอาดให้เป็นเรื่องง่าย</h1>
        <p className="intro-copy">พื้นที่ทำงานที่ช่วยให้ทีมของคุณวางแผน ติดตาม และส่งต่องานได้อย่างเป็นระบบ</p>
        <div className="intro-note"><span className="status-dot" aria-hidden="true" /><span>พร้อมดูแลงานของคุณในทุกวัน</span></div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-header">
          <div className="mobile-logo brand-logo" aria-hidden="true"><span className="brand-shield"><span className="brand-roof" /></span><span className="brand-name">D-PROKLEANMATE</span></div>
          <h2 id="auth-title">{recoveryMode ? 'ลืมรหัสผ่าน' : isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</h2>
          <p>{recoveryMode ? 'กรอกอีเมลหรือเบอร์โทรศัพท์ที่คุณใช้ลงทะเบียน' : isRegistering ? 'Create an Account' : ''}</p>
        </div>

        {!recoveryMode && <div className="mode-switch" role="tablist" aria-label="เลือกประเภทการใช้งาน"><Link href="/login" role="tab" aria-selected={!isRegistering} className={!isRegistering ? 'active' : ''}>เข้าสู่ระบบ</Link><Link href="/register" role="tab" aria-selected={isRegistering} className={isRegistering ? 'active' : ''}>สมัครสมาชิก</Link></div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegistering && <><label htmlFor="full-name">ชื่อ-นามสกุล</label><input id="full-name" type="text" autoComplete="name" placeholder="กรอกชื่อ-นามสกุล" value={fullName} onChange={(event) => setFullName(event.target.value)} /><label htmlFor="phone">เบอร์โทรศัพท์</label><input id="phone" type="tel" autoComplete="tel" placeholder="กรอกเบอร์โทรศัพท์" value={phone} onChange={(event) => setPhone(event.target.value)} /></>}
          <label htmlFor="email">อีเมล{recoveryMode ? 'ที่ลงทะเบียน' : ''}</label>
          <input id="email" type="email" placeholder={recoveryMode ? 'กรอกอีเมลที่ใช้ลงทะเบียน' : 'กรอกอีเมล'} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          {isRegistering && <><label htmlFor="username">ชื่อผู้ใช้งาน</label><input id="username" type="text" autoComplete="username" placeholder="กรอกชื่อผู้ใช้งาน (Username)" value={username} onChange={(event) => setUsername(event.target.value)} /></>}
          {!recoveryMode && <div className="label-row"><label htmlFor="password">รหัสผ่าน</label>{!isRegistering && <Link href="/forgot-password" className="text-button">ลืมรหัสผ่าน?</Link>}</div>}
          {!recoveryMode && <><div className="password-field"><input id="password" type={showPassword ? 'text' : 'password'} placeholder="อย่างน้อย 6 ตัวอักษร" autoComplete={isRegistering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="password-toggle" aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'ซ่อน' : 'แสดง'}</button></div>{isRegistering && <><label htmlFor="confirm-password">ยืนยันรหัสผ่าน</label><div className="password-field"><input id="confirm-password" type={showPassword ? 'text' : 'password'} placeholder="กรอกรหัสผ่านอีกครั้ง" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div><p className="password-hint">รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรพิมพ์ใหญ่, ตัวอักษรพิมพ์เล็ก, ตัวเลขและอักขระพิเศษ</p></>}{!isRegistering && <label className="remember-row"><input type="checkbox" /> จำฉันไว้ในระบบ</label>}</>}
          {message.text && <p className={`form-message ${message.type}`} role="alert">{message.text}</p>}
          <button type="submit" className="submit-button" disabled={isLoading}>{isLoading ? 'กำลังดำเนินการ...' : recoveryMode ? 'รีเซ็ตรหัสผ่าน' : isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</button>
        </form>

        {!recoveryMode && <p className="switch-account">{isRegistering ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?'} <Link href={isRegistering ? '/login' : '/register'} className="text-button">{isRegistering ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</Link></p>}
        {recoveryMode && <><div className="social-divider"><span>จำรหัสผ่านได้แล้ว?</span></div><Link href="/login" className="back-login">← กลับไปหน้าเข้าสู่ระบบ</Link></>}
      </section>
    </main>
  );
}