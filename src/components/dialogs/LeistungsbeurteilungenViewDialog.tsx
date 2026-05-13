import type { Leistungsbeurteilungen, Mitarbeiter } from '@/types/app';
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

interface LeistungsbeurteilungenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Leistungsbeurteilungen | null;
  onEdit: (record: Leistungsbeurteilungen) => void;
  mitarbeiterList: Mitarbeiter[];
}

export function LeistungsbeurteilungenViewDialog({ open, onClose, record, onEdit, mitarbeiterList }: LeistungsbeurteilungenViewDialogProps) {
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
          <DialogTitle>Leistungsbeurteilungen anzeigen</DialogTitle>
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
            <p className="text-sm">{getMitarbeiterDisplayName(record.fields.lb_mitarbeiter)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beurteilungszeitraum</Label>
            <p className="text-sm">{record.fields.lb_beurteilungszeitraum ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beurteiler Vorname</Label>
            <p className="text-sm">{record.fields.lb_beurteiler_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beurteiler Nachname</Label>
            <p className="text-sm">{record.fields.lb_beurteiler_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beurteilungsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.lb_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fachkompetenz</Label>
            <Badge variant="secondary">{record.fields.lb_fachkompetenz?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Teamarbeit</Label>
            <Badge variant="secondary">{record.fields.lb_teamarbeit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kommunikation</Label>
            <Badge variant="secondary">{record.fields.lb_kommunikation?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigeninitiative</Label>
            <Badge variant="secondary">{record.fields.lb_eigeninitiative?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtbewertung</Label>
            <Badge variant="secondary">{record.fields.lb_gesamtbewertung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stärken</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.lb_staerken ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Entwicklungsfelder</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.lb_entwicklungsfelder ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ziele für den nächsten Zeitraum</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.lb_ziele ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Allgemeiner Kommentar</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.lb_kommentar ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}