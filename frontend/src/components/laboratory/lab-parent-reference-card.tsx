'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LabParentFormReference } from '@/lib/api/laboratory';
import { useTranslation } from '@/stores/locale-store';

interface LabParentReferenceCardProps {
  parent: LabParentFormReference;
  ltrId: string;
}

export function LabParentReferenceCard({ parent, ltrId }: LabParentReferenceCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t.laboratory.parentReferenceTitle}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">{t.laboratory.ltrId}</p>
          <p className="font-mono font-semibold">{ltrId}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t.laboratory.parentFormId}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{parent.templateCode}</Badge>
            <span className="font-mono font-medium">{parent.referenceNumber}</span>
          </div>
        </div>
        {parent.location && (
          <div>
            <p className="text-xs text-muted-foreground">{t.laboratory.parentLocation}</p>
            <p>{parent.location}</p>
          </div>
        )}
        {parent.materialType && (
          <div>
            <p className="text-xs text-muted-foreground">{t.laboratory.parentMaterial}</p>
            <p>{parent.materialType}</p>
          </div>
        )}
        {parent.chainage && (
          <div>
            <p className="text-xs text-muted-foreground">{t.laboratory.parentChainage}</p>
            <p dir="ltr">{parent.chainage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
