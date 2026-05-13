import { useState, useEffect, useRef, useCallback } from 'react';
import type { Leistungsbeurteilungen, Mitarbeiter } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconArrowBigDownLinesFilled, IconCamera, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface LeistungsbeurteilungenDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Leistungsbeurteilungen['fields']) => Promise<void>;
  defaultValues?: Leistungsbeurteilungen['fields'];
  mitarbeiterList: Mitarbeiter[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function LeistungsbeurteilungenDialog({ open, onClose, onSubmit, defaultValues, mitarbeiterList, enablePhotoScan = true, enablePhotoLocation = true }: LeistungsbeurteilungenDialogProps) {
  const [fields, setFields] = useState<Partial<Leistungsbeurteilungen['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'leistungsbeurteilungen');
      await onSubmit(clean as Leistungsbeurteilungen['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="lb_mitarbeiter" entity="Mitarbeiter">\n${JSON.stringify(mitarbeiterList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "lb_mitarbeiter": string | null, // Display name from Mitarbeiter (see <available-records>)\n  "lb_beurteilungszeitraum": string | null, // Beurteilungszeitraum\n  "lb_beurteiler_vorname": string | null, // Beurteiler Vorname\n  "lb_beurteiler_nachname": string | null, // Beurteiler Nachname\n  "lb_datum": string | null, // YYYY-MM-DD\n  "lb_fachkompetenz": LookupValue | null, // Fachkompetenz (select one key: "k1" | "k2" | "k3" | "k4" | "k5") mapping: k1=1 – Ungenügend, k2=2 – Verbesserungsbedarf, k3=3 – Entspricht Erwartungen, k4=4 – Übertrifft Erwartungen, k5=5 – Hervorragend\n  "lb_teamarbeit": LookupValue | null, // Teamarbeit (select one key: "t1" | "t2" | "t3" | "t4" | "t5") mapping: t1=1 – Ungenügend, t2=2 – Verbesserungsbedarf, t3=3 – Entspricht Erwartungen, t4=4 – Übertrifft Erwartungen, t5=5 – Hervorragend\n  "lb_kommunikation": LookupValue | null, // Kommunikation (select one key: "c2" | "c3" | "c4" | "c5" | "c1") mapping: c2=2 – Verbesserungsbedarf, c3=3 – Entspricht Erwartungen, c4=4 – Übertrifft Erwartungen, c5=5 – Hervorragend, c1=1 – Ungenügend\n  "lb_eigeninitiative": LookupValue | null, // Eigeninitiative (select one key: "e1" | "e2" | "e3" | "e4" | "e5") mapping: e1=1 – Ungenügend, e2=2 – Verbesserungsbedarf, e3=3 – Entspricht Erwartungen, e4=4 – Übertrifft Erwartungen, e5=5 – Hervorragend\n  "lb_gesamtbewertung": LookupValue | null, // Gesamtbewertung (select one key: "gesamt1" | "gesamt2" | "gesamt3" | "gesamt4" | "gesamt5") mapping: gesamt1=Ungenügend, gesamt2=Verbesserungsbedarf, gesamt3=Entspricht Erwartungen, gesamt4=Übertrifft Erwartungen, gesamt5=Hervorragend\n  "lb_staerken": string | null, // Stärken\n  "lb_entwicklungsfelder": string | null, // Entwicklungsfelder\n  "lb_ziele": string | null, // Ziele für den nächsten Zeitraum\n  "lb_kommentar": string | null, // Allgemeiner Kommentar\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["lb_mitarbeiter"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const lb_mitarbeiterName = raw['lb_mitarbeiter'] as string | null;
        if (lb_mitarbeiterName) {
          const lb_mitarbeiterMatch = mitarbeiterList.find(r => matchName(lb_mitarbeiterName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (lb_mitarbeiterMatch) merged['lb_mitarbeiter'] = createRecordUrl(APP_IDS.MITARBEITER, lb_mitarbeiterMatch.record_id);
        }
        return merged as Partial<Leistungsbeurteilungen['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Leistungsbeurteilungen bearbeiten' : 'Leistungsbeurteilungen hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
            <div className="flex justify-center pt-1">
              <IconArrowBigDownLinesFilled className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lb_mitarbeiter">Mitarbeiter</Label>
            <Select
              value={extractRecordId(fields.lb_mitarbeiter) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, lb_mitarbeiter: v === 'none' ? undefined : createRecordUrl(APP_IDS.MITARBEITER, v) }))}
            >
              <SelectTrigger id="lb_mitarbeiter"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {mitarbeiterList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.vorname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_beurteilungszeitraum">Beurteilungszeitraum</Label>
            <Input
              id="lb_beurteilungszeitraum"
              value={fields.lb_beurteilungszeitraum ?? ''}
              onChange={e => setFields(f => ({ ...f, lb_beurteilungszeitraum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_beurteiler_vorname">Beurteiler Vorname</Label>
            <Input
              id="lb_beurteiler_vorname"
              value={fields.lb_beurteiler_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, lb_beurteiler_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_beurteiler_nachname">Beurteiler Nachname</Label>
            <Input
              id="lb_beurteiler_nachname"
              value={fields.lb_beurteiler_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, lb_beurteiler_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_datum">Beurteilungsdatum</Label>
            <Input
              id="lb_datum"
              type="date"
              value={fields.lb_datum ?? ''}
              onChange={e => setFields(f => ({ ...f, lb_datum: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_fachkompetenz">Fachkompetenz</Label>
            <Select
              value={lookupKey(fields.lb_fachkompetenz) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, lb_fachkompetenz: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="lb_fachkompetenz"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="k1">1 – Ungenügend</SelectItem>
                <SelectItem value="k2">2 – Verbesserungsbedarf</SelectItem>
                <SelectItem value="k3">3 – Entspricht Erwartungen</SelectItem>
                <SelectItem value="k4">4 – Übertrifft Erwartungen</SelectItem>
                <SelectItem value="k5">5 – Hervorragend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_teamarbeit">Teamarbeit</Label>
            <Select
              value={lookupKey(fields.lb_teamarbeit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, lb_teamarbeit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="lb_teamarbeit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="t1">1 – Ungenügend</SelectItem>
                <SelectItem value="t2">2 – Verbesserungsbedarf</SelectItem>
                <SelectItem value="t3">3 – Entspricht Erwartungen</SelectItem>
                <SelectItem value="t4">4 – Übertrifft Erwartungen</SelectItem>
                <SelectItem value="t5">5 – Hervorragend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_kommunikation">Kommunikation</Label>
            <Select
              value={lookupKey(fields.lb_kommunikation) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, lb_kommunikation: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="lb_kommunikation"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="c2">2 – Verbesserungsbedarf</SelectItem>
                <SelectItem value="c3">3 – Entspricht Erwartungen</SelectItem>
                <SelectItem value="c4">4 – Übertrifft Erwartungen</SelectItem>
                <SelectItem value="c5">5 – Hervorragend</SelectItem>
                <SelectItem value="c1">1 – Ungenügend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_eigeninitiative">Eigeninitiative</Label>
            <Select
              value={lookupKey(fields.lb_eigeninitiative) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, lb_eigeninitiative: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="lb_eigeninitiative"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="e1">1 – Ungenügend</SelectItem>
                <SelectItem value="e2">2 – Verbesserungsbedarf</SelectItem>
                <SelectItem value="e3">3 – Entspricht Erwartungen</SelectItem>
                <SelectItem value="e4">4 – Übertrifft Erwartungen</SelectItem>
                <SelectItem value="e5">5 – Hervorragend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_gesamtbewertung">Gesamtbewertung</Label>
            <Select
              value={lookupKey(fields.lb_gesamtbewertung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, lb_gesamtbewertung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="lb_gesamtbewertung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="gesamt1">Ungenügend</SelectItem>
                <SelectItem value="gesamt2">Verbesserungsbedarf</SelectItem>
                <SelectItem value="gesamt3">Entspricht Erwartungen</SelectItem>
                <SelectItem value="gesamt4">Übertrifft Erwartungen</SelectItem>
                <SelectItem value="gesamt5">Hervorragend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_staerken">Stärken</Label>
            <Textarea
              id="lb_staerken"
              value={fields.lb_staerken ?? ''}
              onChange={e => setFields(f => ({ ...f, lb_staerken: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_entwicklungsfelder">Entwicklungsfelder</Label>
            <Textarea
              id="lb_entwicklungsfelder"
              value={fields.lb_entwicklungsfelder ?? ''}
              onChange={e => setFields(f => ({ ...f, lb_entwicklungsfelder: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_ziele">Ziele für den nächsten Zeitraum</Label>
            <Textarea
              id="lb_ziele"
              value={fields.lb_ziele ?? ''}
              onChange={e => setFields(f => ({ ...f, lb_ziele: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lb_kommentar">Allgemeiner Kommentar</Label>
            <Textarea
              id="lb_kommentar"
              value={fields.lb_kommentar ?? ''}
              onChange={e => setFields(f => ({ ...f, lb_kommentar: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}