import type { Stellen, Abteilungen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface StellenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Stellen | null;
  onEdit: (record: Stellen) => void;
  abteilungenList: Abteilungen[];
}

export function StellenViewDialog({ open, onClose, record, onEdit, abteilungenList }: StellenViewDialogProps) {
  function getAbteilungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return abteilungenList.find(r => r.record_id === id)?.fields.abteilung_name ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stellen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stellenbezeichnung</Label>
            <p className="text-sm">{record.fields.stelle_titel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abteilung</Label>
            <p className="text-sm">{getAbteilungenDisplayName(record.fields.stelle_abteilung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stellenbeschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.stelle_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschäftigungsart</Label>
            <Badge variant="secondary">{record.fields.stelle_beschaeftigungsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mindestgehalt (€)</Label>
            <p className="text-sm">{record.fields.stelle_gehalt_min ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Maximalgehalt (€)</Label>
            <p className="text-sm">{record.fields.stelle_gehalt_max ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anforderungen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.stelle_anforderungen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}