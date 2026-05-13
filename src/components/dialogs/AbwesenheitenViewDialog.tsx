import type { Abwesenheiten, Mitarbeiter } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface AbwesenheitenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Abwesenheiten | null;
  onEdit: (record: Abwesenheiten) => void;
  mitarbeiterList: Mitarbeiter[];
}

export function AbwesenheitenViewDialog({ open, onClose, record, onEdit, mitarbeiterList }: AbwesenheitenViewDialogProps) {
  function getMitarbeiterDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeiterList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abwesenheiten anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitarbeiter</Label>
            <p className="text-sm">{getMitarbeiterDisplayName(record.fields.abw_mitarbeiter)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abwesenheitsart</Label>
            <Badge variant="secondary">{record.fields.abw_art?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Von (Datum)</Label>
            <p className="text-sm">{formatDate(record.fields.abw_von)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bis (Datum)</Label>
            <p className="text-sm">{formatDate(record.fields.abw_bis)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Begründung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.abw_grund ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.abw_status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Genehmigt von (Vorname)</Label>
            <p className="text-sm">{record.fields.abw_genehmigt_von_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Genehmigt von (Nachname)</Label>
            <p className="text-sm">{record.fields.abw_genehmigt_von_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bemerkung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.abw_bemerkung ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}