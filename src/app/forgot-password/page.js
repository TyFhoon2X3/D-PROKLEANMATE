import AuthPage from '@/components/AuthPage';

export const metadata = { title: 'ลืมรหัสผ่าน | D-ProKleanMate' };

export default function ForgotPasswordPage() {
  return <AuthPage initialMode="login" initialRecovery />;
}