'use client';

import { useRef } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileAttachmentFieldValue } from '@/lib/forms/types';
import { useTranslation } from '@/stores/locale-store';

const ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,application/pdf';

interface DocumentAttachmentInputProps {
  value: FileAttachmentFieldValue | null | undefined;
  onSelect: (file: File) => void;
}

export function DocumentAttachmentInput({
  value,
  onSelect,
}: DocumentAttachmentInputProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full justify-start gap-2"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" />
        {value ? t.forms.replaceAttachment : t.forms.chooseAttachment}
      </Button>
      {value && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <FileText className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate font-medium">{value.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {(value.sizeBytes / 1024).toFixed(0)} KB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
