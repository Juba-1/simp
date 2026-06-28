import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel />
      <LoginForm />
    </div>
  );
}
