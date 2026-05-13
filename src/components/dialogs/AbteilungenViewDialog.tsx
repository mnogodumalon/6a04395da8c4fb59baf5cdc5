import type { Abteilungen } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';

interface AbteilungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Abteilungen | null;
  onEdit: (record: Abteilungen) => void;
}

export function AbteilungenViewDialog({ open, onClose, record, onEdit }: AbteilungenViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abteilungen anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abteilungsname</Label>
            <p className="text-sm">{record.fields.abteilung_name ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kürzel</Label>
            <p className="text-sm">{record.fields.abteilung_kuerzel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.abteilung_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abteilungsleiter Vorname</Label>
            <p className="text-sm">{record.fields.abteilung_leiter_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abteilungsleiter Nachname</Label>
            <p className="text-sm">{record.fields.abteilung_leiter_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Standort</Label>
            <p className="text-sm">{record.fields.abteilung_standort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefon</Label>
            <p className="text-sm">{record.fields.abteilung_telefon ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}