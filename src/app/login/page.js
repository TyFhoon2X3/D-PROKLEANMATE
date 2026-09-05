import AuthPage from '@/components/AuthPage';

export const metadata = { title: 'เข้าสู่ระบบ | D-ProKleanMate' };

export default function LoginPage() {
  return <AuthPage initialMode="login" />;
}