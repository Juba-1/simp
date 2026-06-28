'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { updateMyProfile, uploadMyAvatar } from '@/lib/api/users';
import type { UserPreferences } from '@/lib/api/users';
import { ApiError } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/stores/locale-store';

const defaultPrefs: UserPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  slaAlerts: true,
  weeklyDigest: false,
};

export function ProfileTab() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateUser = useAuthStore((s) => s.updateUser);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>({
    ...defaultPrefs,
    ...(user?.preferences as UserPreferences | undefined),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setAvatarUrl(user.avatarUrl ?? '');
    setPrefs({ ...defaultPrefs, ...(user.preferences as UserPreferences) });
  }, [user]);

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';

  const loginDisplay =
    user?.loginId ?? user?.username ?? user?.email ?? '—';

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !accessToken) return;

      if (!file.type.startsWith('image/')) {
        toast.error(t.settings.avatarUploadError);
        return;
      }

      setUploadingAvatar(true);
      try {
        const updated = await uploadMyAvatar(accessToken, file);
        setAvatarUrl(updated.avatarUrl ?? '');
        updateUser({
          avatarUrl: updated.avatarUrl,
          firstName: updated.firstName,
          lastName: updated.lastName,
        });
        toast.success(t.settings.profileSaved);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t.settings.avatarUploadError,
        );
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [
      accessToken,
      updateUser,
      t.settings.avatarUploadError,
      t.settings.profileSaved,
    ],
  );

  const handleSave = useCallback(async () => {
    if (!accessToken || !user) return;
    setSaving(true);
    try {
      const updated = await updateMyProfile(accessToken, {
        firstName,
        lastName,
        preferences: prefs,
      });
      updateUser({
        firstName: updated.firstName,
        lastName: updated.lastName,
        preferences: updated.preferences,
      });
      toast.success(t.settings.profileSaved);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.settings.profileSaveError,
      );
    } finally {
      setSaving(false);
    }
  }, [
    accessToken,
    user,
    firstName,
    lastName,
    prefs,
    updateUser,
    t.settings.profileSaved,
    t.settings.profileSaveError,
  ]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.profile}</CardTitle>
          <CardDescription>{t.settings.profileDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative">
              <Avatar className="size-24 ring-2 ring-primary/20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={firstName} />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="w-full flex-1 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => void handleAvatarChange(e)}
                disabled={uploadingAvatar}
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                {uploadingAvatar
                  ? t.settings.avatarUploading
                  : t.settings.avatarUpload}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t.settings.avatarHint}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t.auth.firstName}</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t.auth.lastName}</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.settings.loginId}</Label>
            <Input value={loginDisplay} disabled dir="ltr" />
          </div>

          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t.common.save}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.settings.notifications}</CardTitle>
          <CardDescription>{t.settings.notificationsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PrefRow
            label={t.settings.notifyEmail}
            description={t.settings.notifyEmailDesc}
            checked={prefs.emailNotifications ?? true}
            onCheckedChange={(v) =>
              setPrefs((p) => ({ ...p, emailNotifications: v }))
            }
          />
          <PrefRow
            label={t.settings.notifyPush}
            description={t.settings.notifyPushDesc}
            checked={prefs.pushNotifications ?? true}
            onCheckedChange={(v) =>
              setPrefs((p) => ({ ...p, pushNotifications: v }))
            }
          />
          <PrefRow
            label={t.settings.notifySla}
            description={t.settings.notifySlaDesc}
            checked={prefs.slaAlerts ?? true}
            onCheckedChange={(v) => setPrefs((p) => ({ ...p, slaAlerts: v }))}
          />
          <PrefRow
            label={t.settings.notifyDigest}
            description={t.settings.notifyDigestDesc}
            checked={prefs.weeklyDigest ?? false}
            onCheckedChange={(v) =>
              setPrefs((p) => ({ ...p, weeklyDigest: v }))
            }
          />
          <Button
            variant="secondary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {t.settings.saveNotifications}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PrefRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
