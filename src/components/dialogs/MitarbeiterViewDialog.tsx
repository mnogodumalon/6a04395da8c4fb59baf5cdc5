import type { Mitarbeiter, Abteilungen, Stellen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface MitarbeiterViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Mitarbeiter | null;
  onEdit: (record: Mitarbeiter) => void;
  abteilungenList: Abteilungen[];
  stellenList: Stellen[];
}

export function MitarbeiterViewDialog({ open, onClose, record, onEdit, abteilungenList, stellenList }: MitarbeiterViewDialogProps) {
  function getAbteilungenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return abteilungenList.find(r => r.record_id === id)?.fields.abteilung_name ?? '—';
  }

  function getStellenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return stellenList.find(r => r.record_id === id)?.fields.stelle_titel ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mitarbeiter anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname</Label>
            <p className="text-sm">{record.fields.vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname</Label>
            <p className="text-sm">{record.fields.nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geburtsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.geburtsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geschlecht</Label>
            <Badge variant="secondary">{record.fields.geschlecht?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">E-Mail-Adresse</Label>
            <p className="text-sm">{record.fields.email ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Telefon</Label>
            <p className="text-sm">{record.fields.telefon ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Straße</Label>
            <p className="text-sm">{record.fields.strasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hausnummer</Label>
            <p className="text-sm">{record.fields.hausnummer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Postleitzahl</Label>
            <p className="text-sm">{record.fields.plz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ort</Label>
            <p className="text-sm">{record.fields.ort ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitarbeiternummer</Label>
            <p className="text-sm">{record.fields.mitarbeiter_nr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eintrittsdatum</Label>
            <p className="text-sm">{formatDate(record.fields.eintrittsdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschäftigungsstatus</Label>
            <Badge variant="secondary">{record.fields.beschaeftigungsstatus?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vertragsart</Label>
            <Badge variant="secondary">{record.fields.vertragsart?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abteilung</Label>
            <p className="text-sm">{getAbteilungenDisplayName(record.fields.ma_abteilung)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stelle</Label>
            <p className="text-sm">{getStellenDisplayName(record.fields.ma_stelle)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitarbeiterfoto</Label>
            {record.fields.ma_foto ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.ma_foto} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.ma_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}