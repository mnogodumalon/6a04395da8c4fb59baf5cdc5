import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const PROXY_BASE = '';
const APP_ID = '6a04393ce2ed260f9576b292';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitForm(fields: Record<string, unknown>, captchaToken: string) {
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

export default function UeberstundenForm() {
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [datum, setDatum] = useState('');
  const [stunden, setStunden] = useState('');
  const [projekt, setProjekt] = useState('');
  const [begruendung, setBegruendung] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);

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
    if (params.get('vorname')) setVorname(params.get('vorname')!);
    if (params.get('nachname')) setNachname(params.get('nachname')!);
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
      await submitForm({
        lb_beurteiler_vorname: vorname,
        lb_beurteiler_nachname: nachname,
        lb_datum: datum || undefined,
        lb_staerken: stunden ? `${stunden} Stunden` : undefined,
        lb_beurteilungszeitraum: projekt || undefined,
        lb_kommentar: begruendung || undefined,
        lb_ziele: 'ÜBERSTUNDEN',
      }, token);
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
          <div className="h-16 w-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Überstunden gemeldet!</h2>
          <p className="text-muted-foreground">Deine Überstunden wurden erfolgreich an die Personalabteilung übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => {
            setSubmitted(false);
            setDatum('');
            setStunden('');
            setProjekt('');
            setBegruendung('');
          }}>
            Weitere Überstunden melden
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Überstunden melden</h1>
          <p className="text-muted-foreground mt-1">Trage deine geleisteten Überstunden ein</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vorname">Vorname</Label>
              <Input
                id="vorname"
                value={vorname}
                onChange={e => setVorname(e.target.value)}
                required
                placeholder="Max"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nachname">Nachname</Label>
              <Input
                id="nachname"
                value={nachname}
                onChange={e => setNachname(e.target.value)}
                required
                placeholder="Mustermann"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="datum">Datum</Label>
              <Input
                id="datum"
                type="date"
                value={datum}
                onChange={e => setDatum(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stunden">Anzahl Stunden</Label>
              <Input
                id="stunden"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={stunden}
                onChange={e => setStunden(e.target.value)}
                required
                placeholder="z.B. 2.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="projekt">Projekt / Aufgabe</Label>
            <Input
              id="projekt"
              value={projekt}
              onChange={e => setProjekt(e.target.value)}
              placeholder="Woran hast du gearbeitet?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="begruendung">Begründung</Label>
            <Textarea
              id="begruendung"
              value={begruendung}
              onChange={e => setBegruendung(e.target.value)}
              rows={3}
              placeholder="Warum waren die Überstunden notwendig?"
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
            {submitting ? 'Wird gesendet...' : 'Überstunden einreichen'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}
