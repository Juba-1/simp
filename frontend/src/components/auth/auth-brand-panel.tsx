'use client';

import { Building2, Shield, Zap } from 'lucide-react';
import { useTranslation } from '@/stores/locale-store';

export function AuthBrandPanel() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Shield,
      title: 'Anti-Fraud by Design',
      titleAr: 'مكافحة الاحتيال',
      desc: 'Live camera, GPS watermarking, and immutable audit trails.',
    },
    {
      icon: Zap,
      title: 'Offline-First',
      titleAr: 'يعمل بدون إنترنت',
      desc: 'Field teams work anywhere. Sync when connected.',
    },
    {
      icon: Building2,
      title: 'Enterprise PMIS',
      titleAr: 'إدارة مشاريع متكاملة',
      desc: 'WIR, NCR, IPC, and 15 standardized forms.',
    },
  ];

  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#0c4a6e] via-[#0369a1] to-[#0ea5e9] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-40" />

      <div className="relative z-10">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
            <Building2 className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t.common.appName}</h1>
            <p className="text-sm text-sky-100">{t.common.appTagline}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 space-y-6">
        {features.map((feature) => (
          <div key={feature.title} className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <feature.icon className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="text-sm text-sky-100">{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="relative z-10 text-xs text-sky-200/80">
        © {new Date().getFullYear()} SIMP Platform. Enterprise Infrastructure Management.
      </p>
    </div>
  );
}
