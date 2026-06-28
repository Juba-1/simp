import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel />
      <RegisterForm />
    </div>
  );
}
