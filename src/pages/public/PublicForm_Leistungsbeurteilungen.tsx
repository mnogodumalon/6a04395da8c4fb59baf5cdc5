import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { lookupKey } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a04393ce2ed260f9576b292';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormLeistungsbeurteilungen() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Leistungsbeurteilungen — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
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

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
