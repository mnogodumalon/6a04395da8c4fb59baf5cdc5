import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { LeistungsbeurteilungenDialog } from '@/components/dialogs/LeistungsbeurteilungenDialog';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichMitarbeiter, enrichLeistungsbeurteilungen } from '@/lib/enrich';
import type { EnrichedMitarbeiter, EnrichedLeistungsbeurteilungen } from '@/types/enriched';
import type { Leistungsbeurteilungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { Button } from '@/components/ui/button';
import {
  IconUser,
  IconClipboard,
  IconCheck,
  IconArrowLeft,
  IconPlus,
  IconStar,
  IconCalendar,
  IconRefresh,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Mitarbeiter' },
  { label: 'Beurteilung' },
  { label: 'Abschluss' },
];

export default function LeistungsbeurteilungPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    mitarbeiter,
    leistungsbeurteilungen,
    abteilungenMap,
    stellenMap,
    mitarbeiterMap,
    loading,
    error,
    fetchAll,
  } = useDashboardData();

  // Wizard state — ALL hooks before any early returns
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedMitarbeiter, setSelectedMitarbeiter] = useState<EnrichedMitarbeiter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<Leistungsbeurteilungen[]>([]);

  // Enriched lists
  const enrichedMitarbeiter = useMemo(
    () => enrichMitarbeiter(mitarbeiter, { abteilungenMap, stellenMap }),
    [mitarbeiter, abteilungenMap, stellenMap]
  );

  const enrichedBeurteilungen = useMemo(
    () => enrichLeistungsbeurteilungen(leistungsbeurteilungen, { mitarbeiterMap }),
    [leistungsbeurteilungen, mitarbeiterMap]
  );

  // Beurteilungen grouped by Mitarbeiter record_id
  const beurteilungenByMitarbeiter = useMemo(() => {
    const map = new Map<string, EnrichedLeistungsbeurteilungen[]>();
    enrichedBeurteilungen.forEach(b => {
      const mid = extractRecordId(b.fields.lb_mitarbeiter);
      if (!mid) return;
      if (!map.has(mid)) map.set(mid, []);
      map.get(mid)!.push(b);
    });
    return map;
  }, [enrichedBeurteilungen]);

  // Deep-linking: read ?mitarbeiterId and ?step from URL on mount
  useEffect(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    const urlMitarbeiterId = searchParams.get('mitarbeiterId');

    if (urlMitarbeiterId && enrichedMitarbeiter.length > 0) {
      const found = enrichedMitarbeiter.find(m => m.record_id === urlMitarbeiterId);
      if (found) {
        setSelectedMitarbeiter(found);
        const step = (urlStep >= 1 && urlStep <= 3) ? urlStep : 2;
        setCurrentStep(step);
        return;
      }
    }
    if (urlStep >= 1 && urlStep <= 3) {
      setCurrentStep(urlStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedMitarbeiter.length > 0 ? 'loaded' : 'loading']);

  // Sync currentStep and selectedMitarbeiter to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    if (selectedMitarbeiter) {
      params.set('mitarbeiterId', selectedMitarbeiter.record_id);
    } else {
      params.delete('mitarbeiterId');
    }
    setSearchParams(params, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedMitarbeiter?.record_id]);

  // Beurteilungen for the currently selected Mitarbeiter (from full dataset)
  const beurteilungenForSelected = useMemo(() => {
    if (!selectedMitarbeiter) return [];
    return (beurteilungenByMitarbeiter.get(selectedMitarbeiter.record_id) ?? []).sort(
      (a, b) => (b.fields.lb_datum ?? '').localeCompare(a.fields.lb_datum ?? '')
    );
  }, [selectedMitarbeiter, beurteilungenByMitarbeiter]);

  // Newly created beurteilungen for the selected Mitarbeiter in this session
  const newlyCreatedForSelected = useMemo(() => {
    if (!selectedMitarbeiter) return [];
    return newlyCreated.filter(
      b => extractRecordId(b.fields.lb_mitarbeiter) === selectedMitarbeiter.record_id
    );
  }, [newlyCreated, selectedMitarbeiter]);

  // Last existing beurteilung before this session
  const lastBeurteilung = useMemo(() => {
    return beurteilungenForSelected.find(
      b => !newlyCreated.some(n => n.record_id === b.record_id)
    ) ?? null;
  }, [beurteilungenForSelected, newlyCreated]);

  function handleSelectMitarbeiter(id: string) {
    const found = enrichedMitarbeiter.find(m => m.record_id === id);
    if (found) {
      setSelectedMitarbeiter(found);
      setNewlyCreated([]);
      setCurrentStep(2);
    }
  }

  async function handleBeurteilungSubmit(fields: Leistungsbeurteilungen['fields']) {
    const result = await LivingAppsService.createLeistungsbeurteilungenEntry(fields);
    await fetchAll();
    // Capture the newly created record for live feedback
    // We reconstruct it with a temporary record_id from the response if available
    const newRecord: Leistungsbeurteilungen = {
      record_id: (result && typeof result === 'object' && 'id' in result) ? String(result.id) : String(Date.now()),
      createdat: new Date().toISOString(),
      updatedat: null,
      fields,
    };
    setNewlyCreated(prev => [...prev, newRecord]);
  }

  function handleReset() {
    setSelectedMitarbeiter(null);
    setNewlyCreated([]);
    setCurrentStep(1);
  }

  function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  function getGesamtbewertungLabel(b: Leistungsbeurteilungen): string {
    const v = b.fields.lb_gesamtbewertung;
    if (!v) return '—';
    if (typeof v === 'object' && 'label' in v) return v.label;
    return String(v);
  }

  // Build EntitySelectStep items
  const selectItems = useMemo(() =>
    enrichedMitarbeiter.map(m => {
      const count = beurteilungenByMitarbeiter.get(m.record_id)?.length ?? 0;
      const statusVal = m.fields.beschaeftigungsstatus;
      return {
        id: m.record_id,
        title: [m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || m.record_id,
        subtitle: [m.ma_stelleName, m.ma_abteilungName].filter(Boolean).join(' · ') || undefined,
        status: statusVal ? { key: statusVal.key, label: statusVal.label } : undefined,
        stats: [{ label: 'Beurteilungen', value: count }],
        icon: <IconUser size={18} className="text-primary/70" />,
      };
    }),
    [enrichedMitarbeiter, beurteilungenByMitarbeiter]
  );

  return (
    <IntentWizardShell
      title="Leistungsbeurteilung durchführen"
      subtitle="Wähle einen Mitarbeiter aus und erfasse die Beurteilungsdetails."
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ============================================================
          Schritt 1: Mitarbeiter auswählen
      ============================================================ */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Mitarbeiter auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle den Mitarbeiter aus, für den du eine Leistungsbeurteilung erfassen möchtest.
            </p>
          </div>
          <EntitySelectStep
            items={selectItems}
            onSelect={handleSelectMitarbeiter}
            searchPlaceholder="Nach Name suchen..."
            emptyIcon={<IconUser size={32} />}
            emptyText="Keine Mitarbeiter gefunden."
          />
        </div>
      )}

      {/* ============================================================
          Schritt 2: Beurteilung erfassen
      ============================================================ */}
      {currentStep === 2 && selectedMitarbeiter && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Beurteilung erfassen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Erstelle eine neue Leistungsbeurteilung für den ausgewählten Mitarbeiter.
            </p>
          </div>

          {/* Mitarbeiter-Infobox */}
          <div className="rounded-xl border bg-card p-4 space-y-3 overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconUser size={20} className="text-primary/70" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">
                    {[selectedMitarbeiter.fields.vorname, selectedMitarbeiter.fields.nachname].filter(Boolean).join(' ')}
                  </span>
                  {selectedMitarbeiter.fields.beschaeftigungsstatus && (
                    <StatusBadge
                      statusKey={selectedMitarbeiter.fields.beschaeftigungsstatus.key}
                      label={selectedMitarbeiter.fields.beschaeftigungsstatus.label}
                    />
                  )}
                </div>
                {selectedMitarbeiter.ma_stelleName && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedMitarbeiter.ma_stelleName}</p>
                )}
                {selectedMitarbeiter.ma_abteilungName && (
                  <p className="text-xs text-muted-foreground truncate">{selectedMitarbeiter.ma_abteilungName}</p>
                )}
              </div>
            </div>

            {/* Letzte Beurteilung */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground mb-1">Letzte Beurteilung</p>
              {lastBeurteilung ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium flex items-center gap-1">
                    <IconCalendar size={12} className="text-muted-foreground" />
                    {formatDate(lastBeurteilung.fields.lb_datum)}
                  </span>
                  {lastBeurteilung.fields.lb_gesamtbewertung && (
                    <span className="text-xs text-muted-foreground">
                      · {getGesamtbewertungLabel(lastBeurteilung)}
                    </span>
                  )}
                  {(lastBeurteilung.fields.lb_beurteiler_vorname || lastBeurteilung.fields.lb_beurteiler_nachname) && (
                    <span className="text-xs text-muted-foreground">
                      · {[lastBeurteilung.fields.lb_beurteiler_vorname, lastBeurteilung.fields.lb_beurteiler_nachname].filter(Boolean).join(' ')}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Noch keine Beurteilung vorhanden</p>
              )}
            </div>
          </div>

          {/* Neue Beurteilung Button */}
          <Button
            onClick={() => setDialogOpen(true)}
            className="w-full gap-2"
          >
            <IconPlus size={16} />
            Neue Beurteilung erstellen
          </Button>

          <LeistungsbeurteilungenDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            onSubmit={handleBeurteilungSubmit}
            defaultValues={{ lb_mitarbeiter: createRecordUrl(APP_IDS.MITARBEITER, selectedMitarbeiter.record_id) }}
            mitarbeiterList={mitarbeiter}
            enablePhotoScan={AI_PHOTO_SCAN['Leistungsbeurteilungen']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Leistungsbeurteilungen']}
          />

          {/* In dieser Session erstellte Beurteilungen */}
          {newlyCreatedForSelected.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <IconCheck size={16} className="text-green-600" />
                In dieser Sitzung erstellt ({newlyCreatedForSelected.length})
              </p>
              <div className="space-y-2">
                {newlyCreatedForSelected.map((b, idx) => (
                  <div
                    key={b.record_id ?? idx}
                    className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <IconClipboard size={14} className="text-green-600 shrink-0" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-300 truncate">
                        {b.fields.lb_beurteilungszeitraum ?? 'Beurteilung'}
                      </span>
                      {b.fields.lb_gesamtbewertung && (
                        <span className="text-xs text-green-700 dark:text-green-400">
                          · {getGesamtbewertungLabel(b)}
                        </span>
                      )}
                      {b.fields.lb_datum && (
                        <span className="text-xs text-muted-foreground">{formatDate(b.fields.lb_datum)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bisheriger Verlauf */}
          {beurteilungenForSelected.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Bisherige Beurteilungen ({beurteilungenForSelected.length})
              </p>
              <div className="space-y-2">
                {beurteilungenForSelected.map((b, idx) => {
                  const isNew = newlyCreated.some(n => n.record_id === b.record_id);
                  return (
                    <div
                      key={b.record_id ?? idx}
                      className={`rounded-xl border p-3 overflow-hidden ${isNew ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'bg-card'}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">
                              {b.fields.lb_beurteilungszeitraum ?? '—'}
                            </span>
                            {b.fields.lb_datum && (
                              <span className="text-xs text-muted-foreground shrink-0">{formatDate(b.fields.lb_datum)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {b.fields.lb_gesamtbewertung && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <IconStar size={11} className="text-amber-500" />
                                {getGesamtbewertungLabel(b)}
                              </span>
                            )}
                            {(b.fields.lb_beurteiler_vorname || b.fields.lb_beurteiler_nachname) && (
                              <span className="text-xs text-muted-foreground truncate">
                                {[b.fields.lb_beurteiler_vorname, b.fields.lb_beurteiler_nachname].filter(Boolean).join(' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigations-Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
              disabled={newlyCreatedForSelected.length === 0}
              className="flex-1"
            >
              Abschließen
            </Button>
          </div>
          {newlyCreatedForSelected.length === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Erstelle mindestens eine Beurteilung, um fortfahren zu können.
            </p>
          )}
        </div>
      )}

      {/* ============================================================
          Schritt 3: Zusammenfassung
      ============================================================ */}
      {currentStep === 3 && selectedMitarbeiter && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Beurteilung abgeschlossen</h2>
          </div>

          {/* Erfolgs-Karte */}
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-5 overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
                <IconCheck size={24} className="text-green-600 dark:text-green-400" stroke={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-900 dark:text-green-200 truncate">
                  {[selectedMitarbeiter.fields.vorname, selectedMitarbeiter.fields.nachname].filter(Boolean).join(' ')}
                </p>
                <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
                  {newlyCreatedForSelected.length === 1
                    ? '1 Beurteilung erfolgreich erstellt'
                    : `${newlyCreatedForSelected.length} Beurteilungen erfolgreich erstellt`}
                </p>
                {selectedMitarbeiter.ma_stelleName && (
                  <p className="text-xs text-green-600/80 dark:text-green-500/80 mt-0.5 truncate">
                    {selectedMitarbeiter.ma_stelleName}
                    {selectedMitarbeiter.ma_abteilungName ? ` · ${selectedMitarbeiter.ma_abteilungName}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Details der neu erstellten Beurteilungen */}
          {newlyCreatedForSelected.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Erstellte Beurteilungen</p>
              {newlyCreatedForSelected.map((b, idx) => (
                <div key={b.record_id ?? idx} className="rounded-xl border bg-card p-4 space-y-2 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <IconClipboard size={15} className="text-primary/70 shrink-0" />
                    <span className="font-medium text-sm truncate">
                      {b.fields.lb_beurteilungszeitraum ?? 'Beurteilungszeitraum nicht angegeben'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {b.fields.lb_datum && (
                      <div className="flex gap-1.5">
                        <span className="text-muted-foreground shrink-0">Datum:</span>
                        <span className="font-medium truncate">{formatDate(b.fields.lb_datum)}</span>
                      </div>
                    )}
                    {b.fields.lb_gesamtbewertung && (
                      <div className="flex gap-1.5 items-center">
                        <span className="text-muted-foreground shrink-0">Gesamtbewertung:</span>
                        <span className="font-medium truncate flex items-center gap-1">
                          <IconStar size={12} className="text-amber-500 shrink-0" />
                          {getGesamtbewertungLabel(b)}
                        </span>
                      </div>
                    )}
                    {(b.fields.lb_beurteiler_vorname || b.fields.lb_beurteiler_nachname) && (
                      <div className="flex gap-1.5">
                        <span className="text-muted-foreground shrink-0">Beurteiler:</span>
                        <span className="font-medium truncate">
                          {[b.fields.lb_beurteiler_vorname, b.fields.lb_beurteiler_nachname].filter(Boolean).join(' ')}
                        </span>
                      </div>
                    )}
                  </div>
                  {b.fields.lb_staerken && (
                    <div className="text-xs border-t pt-2">
                      <span className="text-muted-foreground">Stärken: </span>
                      <span className="text-foreground">
                        {b.fields.lb_staerken.length > 100
                          ? b.fields.lb_staerken.slice(0, 100) + '…'
                          : b.fields.lb_staerken}
                      </span>
                    </div>
                  )}
                  {b.fields.lb_ziele && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Ziele: </span>
                      <span className="text-foreground line-clamp-2">{b.fields.lb_ziele}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Aktions-Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button variant="outline" onClick={handleReset} className="gap-2 flex-1">
              <IconRefresh size={16} />
              Weitere Beurteilung
            </Button>
            <Button onClick={() => navigate('/')} className="flex-1">
              Zum Dashboard
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
