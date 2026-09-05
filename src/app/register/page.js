import AuthPage from '@/components/AuthPage';

export const metadata = { title: 'สมัครสมาชิก | D-ProKleanMate' };

export default function RegisterPage() {
  return <AuthPage initialMode="register" />;
}