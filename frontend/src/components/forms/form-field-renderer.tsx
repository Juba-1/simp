'use client';

import type { Control } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SmartCameraInput } from '@/components/camera/smart-camera-input';
import { GpsPickerField } from '@/components/forms/gps-picker-field';
import { DocumentAttachmentInput } from '@/components/forms/document-attachment-input';
import { DatePicker } from '@/components/forms/date-picker-field';
import { TimePicker } from '@/components/forms/time-picker-field';
import type { FormFieldDefinition, FileAttachmentFieldValue } from '@/lib/forms/types';
import { isBooleanFieldType, isPhotoFieldType } from '@/lib/forms/types';
import type { Locale } from '@/lib/i18n';
import { getDirection } from '@/lib/i18n';

interface FormFieldRendererProps {
  field: FormFieldDefinition;
  control: Control<Record<string, unknown>>;
  locale: Locale;
  projectId: string;
  projectName: string;
  userName: string;
  dateTimeLabels?: {
    datePlaceholder: string;
    timePlaceholder: string;
    hour: string;
    minute: string;
    period: string;
    am: string;
    pm: string;
  };
  onPhotoCapture: (key: string, result: import('@/components/camera/smart-camera-input').CameraCaptureResult) => void;
  onAttachmentSelect: (key: string, file: File) => void;
}

function labelFor(field: FormFieldDefinition, locale: Locale) {
  return locale === 'ar' && field.labelAr ? field.labelAr : field.label ?? field.key;
}

function placeholderFor(field: FormFieldDefinition, locale: Locale) {
  return locale === 'ar' && field.placeholderAr
    ? field.placeholderAr
    : field.placeholder;
}

export function FormFieldRenderer({
  field,
  control,
  locale,
  projectId,
  projectName,
  userName,
  dateTimeLabels,
  onPhotoCapture,
  onAttachmentSelect,
}: FormFieldRendererProps) {
  const dir = getDirection(locale);
  if (isPhotoFieldType(field.type)) {
    return (
      <FormField
        control={control}
        name={field.key}
        render={() => (
          <FormItem>
            <FormLabel>{labelFor(field, locale)}</FormLabel>
            <FormControl>
              <SmartCameraInput
                projectId={projectId}
                projectName={projectName}
                userName={userName}
                onCapture={(result) => {
                  onPhotoCapture(field.key, result);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.type === 'gps_picker') {
    return (
      <FormField
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>{labelFor(field, locale)}</FormLabel>
            <FormControl>
              <GpsPickerField
                value={f.value as import('@/lib/forms/types').GpsFieldValue | null}
                onChange={f.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.type === 'file_attachment') {
    return (
      <FormField
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>{labelFor(field, locale)}</FormLabel>
            <FormControl>
              <DocumentAttachmentInput
                value={f.value as FileAttachmentFieldValue | null}
                onSelect={(file) => {
                  const meta: FileAttachmentFieldValue = {
                    fileName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    sizeBytes: file.size,
                    pendingUpload: true,
                  };
                  f.onChange(meta);
                  onAttachmentSelect(field.key, file);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (isBooleanFieldType(field.type)) {
    return (
      <FormField
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel>{labelFor(field, locale)}</FormLabel>
            </div>
            <FormControl>
              <Switch
                checked={Boolean(f.value)}
                onCheckedChange={f.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <FormField
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>{labelFor(field, locale)}</FormLabel>
            <FormControl>
              <Textarea
                {...f}
                value={String(f.value ?? '')}
                placeholder={placeholderFor(field, locale)}
                rows={4}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.type === 'number') {
    return (
      <FormField
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>{labelFor(field, locale)}</FormLabel>
            <FormControl>
              <Input
                type="number"
                inputMode="decimal"
                min={field.min}
                max={field.max}
                readOnly={field.readOnly}
                disabled={field.readOnly}
                value={f.value === undefined || f.value === null ? '' : String(f.value)}
                onChange={(e) =>
                  f.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                }
                placeholder={placeholderFor(field, locale)}
                className="h-12 text-base"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.type === 'time') {
    return (
      <FormField
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>{labelFor(field, locale)}</FormLabel>
            <FormControl>
              <TimePicker
                value={f.value as string | undefined}
                onChange={f.onChange}
                locale={locale}
                dir={dir}
                placeholder={dateTimeLabels?.timePlaceholder ?? placeholderFor(field, locale)}
                hourLabel={dateTimeLabels?.hour}
                minuteLabel={dateTimeLabels?.minute}
                periodLabel={dateTimeLabels?.period}
                amLabel={dateTimeLabels?.am}
                pmLabel={dateTimeLabels?.pm}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.type === 'date') {
    return (
      <FormField
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>{labelFor(field, locale)}</FormLabel>
            <FormControl>
              <DatePicker
                value={f.value as string | undefined}
                onChange={f.onChange}
                locale={locale}
                dir={dir}
                placeholder={dateTimeLabels?.datePlaceholder ?? placeholderFor(field, locale)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  if (field.type === 'select' && field.options?.length) {
    return (
      <FormField
        control={control}
        name={field.key}
        render={({ field: f }) => (
          <FormItem>
            <FormLabel>{labelFor(field, locale)}</FormLabel>
            <Select value={String(f.value ?? '')} onValueChange={f.onChange}>
              <FormControl>
                <SelectTrigger className="h-12 w-full">
                  <SelectValue placeholder={placeholderFor(field, locale)} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {field.options!.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {locale === 'ar' && opt.labelAr ? opt.labelAr : opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={control}
      name={field.key}
      render={({ field: f }) => (
        <FormItem>
          <FormLabel>{labelFor(field, locale)}</FormLabel>
          <FormControl>
            <Input
              {...f}
              value={String(f.value ?? '')}
              type="text"
              placeholder={placeholderFor(field, locale)}
              className="h-12 text-base"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
