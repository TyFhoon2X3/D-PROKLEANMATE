'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านไม่ตรงกัน' });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'เปลี่ยนรหัสผ่านสำเร็จ กำลังกลับไปหน้าเข้าสู่ระบบ' });
      setTimeout(() => router.replace('/login'), 1200);
    }
    setIsLoading(false);
  };

  return (
    <main className="auth-status reset-password-page">
      <form className="reset-password-form" onSubmit={handleSubmit}>
        <h1>ตั้งรหัสผ่านใหม่</h1>
        <label htmlFor="new-password">รหัสผ่านใหม่</label>
        <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <label htmlFor="confirm-new-password">ยืนยันรหัสผ่าน</label>
        <input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}
        <button type="submit" className="submit-button" disabled={isLoading}>{isLoading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่าน'}</button>
      </form>
    </main>
  );
}