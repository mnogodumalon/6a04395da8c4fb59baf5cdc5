import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StellenDialog } from '@/components/dialogs/StellenDialog';
import { MitarbeiterDialog } from '@/components/dialogs/MitarbeiterDialog';
import { Button } from '@/components/ui/button';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import type { Stellen, Mitarbeiter } from '@/types/app';
import {
  IconBriefcase,
  IconUserPlus,
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconRefresh,
  IconHome,
  IconBuildingSkyscraper,
  IconCurrencyEuro,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Stelle auswählen' },
  { label: 'Mitarbeiterdaten' },
  { label: 'Abgeschlossen' },
];

export default function MitarbeiterOnboardingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Wizard state — ALL hooks before early returns
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 3 ? s : 1;
  });

  const [selectedStelleId, setSelectedStelleId] = useState<string | null>(
    () => searchParams.get('stelleId') ?? null
  );

  const [neueMitarbeiter, setNeueMitarbeiter] = useState<Mitarbeiter[]>([]);

  const [stellenDialogOpen, setStellenDialogOpen] = useState(false);
  const [mitarbeiterDialogOpen, setMitarbeiterDialogOpen] = useState(false);

  const { abteilungen, stellen, loading, error, fetchAll, abteilungenMap } = useDashboardData();

  // Sync step to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(currentStep));
    if (selectedStelleId) {
      params.set('stelleId', selectedStelleId);
    } else {
      params.delete('stelleId');
    }
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedStelleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore stelleId from URL on mount
  useEffect(() => {
    const urlStelleId = searchParams.get('stelleId');
    if (urlStelleId && !selectedStelleId) {
      setSelectedStelleId(urlStelleId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const selectedStelle: Stellen | undefined = stellen.find(
    (s) => s.record_id === selectedStelleId
  );

  const selectedAbteilungId = selectedStelle
    ? extractRecordId(selectedStelle.fields.stelle_abteilung)
    : null;

  const selectedAbteilung = selectedAbteilungId
    ? abteilungenMap.get(selectedAbteilungId)
    : undefined;

  function handleStelleSelect(id: string) {
    setSelectedStelleId(id);
  }

  function handleWeiter() {
    if (selectedStelleId) {
      setCurrentStep(2);
    }
  }

  function handleZurueck() {
    setCurrentStep(1);
  }

  function handleAbschliessen() {
    setCurrentStep(3);
  }

  function handleNeuesOnboarding() {
    setSelectedStelleId(null);
    setNeueMitarbeiter([]);
    setCurrentStep(1);
  }

  async function handleStellenCreate(fields: Stellen['fields']) {
    await LivingAppsService.createStellenEntry(fields as any);
    await fetchAll();
  }

  async function handleMitarbeiterCreate(fields: Mitarbeiter['fields']) {
    const result = await LivingAppsService.createMitarbeiterEntry(fields as any);
    await fetchAll();
    // Extract the new record from the API response
    if (result && typeof result === 'object') {
      const entries = Object.entries(result as Record<string, unknown>);
      if (entries.length > 0) {
        const [newId, newRec] = entries[0] as [string, any];
        const newMitarbeiter: Mitarbeiter = { record_id: newId, ...newRec };
        setNeueMitarbeiter((prev) => [...prev, newMitarbeiter]);
      }
    }
  }

  // Compute defaultValues for MitarbeiterDialog
  const mitarbeiterDefaultValues: Mitarbeiter['fields'] | undefined =
    selectedStelleId && selectedStelle
      ? {
          ma_stelle: createRecordUrl(APP_IDS.STELLEN, selectedStelleId),
          ...(selectedAbteilungId
            ? { ma_abteilung: createRecordUrl(APP_IDS.ABTEILUNGEN, selectedAbteilungId) }
            : {}),
        }
      : undefined;

  return (
    <IntentWizardShell
      title="Mitarbeiter-Onboarding"
      subtitle="Erfasse einen neuen Mitarbeiter Schritt für Schritt"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* SCHRITT 1: Stelle auswählen */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Stelle auswählen</h2>
            <p className="text-sm text-muted-foreground">
              Wähle die Stelle aus, für die du einen neuen Mitarbeiter anlegen möchtest.
            </p>
          </div>

          <EntitySelectStep
            items={stellen.map((stelle) => {
              const abtId = extractRecordId(stelle.fields.stelle_abteilung);
              const abt = abtId ? abteilungenMap.get(abtId) : undefined;
              const beschArt = stelle.fields.stelle_beschaeftigungsart;
              const beschArtLabel =
                beschArt && typeof beschArt === 'object' && 'label' in beschArt
                  ? (beschArt as { key: string; label: string }).label
                  : typeof beschArt === 'string'
                  ? beschArt
                  : '';

              return {
                id: stelle.record_id,
                title: stelle.fields.stelle_titel ?? '(Kein Titel)',
                subtitle: [
                  abt?.fields.abteilung_name,
                  beschArtLabel,
                ]
                  .filter(Boolean)
                  .join(' · '),
                icon: <IconBriefcase size={18} className="text-primary" />,
                ...(stelle.record_id === selectedStelleId
                  ? { status: { key: 'aktiv', label: 'Ausgewählt' } }
                  : {}),
                stats:
                  stelle.fields.stelle_gehalt_min != null ||
                  stelle.fields.stelle_gehalt_max != null
                    ? [
                        {
                          label: 'Gehalt',
                          value:
                            stelle.fields.stelle_gehalt_min != null &&
                            stelle.fields.stelle_gehalt_max != null
                              ? `${stelle.fields.stelle_gehalt_min.toLocaleString('de-DE')} – ${stelle.fields.stelle_gehalt_max.toLocaleString('de-DE')} €`
                              : stelle.fields.stelle_gehalt_min != null
                              ? `ab ${stelle.fields.stelle_gehalt_min.toLocaleString('de-DE')} €`
                              : `bis ${stelle.fields.stelle_gehalt_max!.toLocaleString('de-DE')} €`,
                        },
                      ]
                    : [],
              };
            })}
            onSelect={handleStelleSelect}
            searchPlaceholder="Stelle suchen..."
            emptyIcon={<IconBriefcase size={36} />}
            emptyText="Noch keine Stellen vorhanden. Lege jetzt eine neue Stelle an."
            createLabel="Neue Stelle anlegen"
            onCreateNew={() => setStellenDialogOpen(true)}
            createDialog={
              <StellenDialog
                open={stellenDialogOpen}
                onClose={() => setStellenDialogOpen(false)}
                onSubmit={handleStellenCreate}
                abteilungenList={abteilungen}
                enablePhotoScan={AI_PHOTO_SCAN['Stellen']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Stellen']}
              />
            }
          />

          {selectedStelleId && (
            <div className="flex justify-end pt-2">
              <Button onClick={handleWeiter} className="gap-2">
                Weiter
                <IconArrowRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* SCHRITT 2: Mitarbeiterdaten erfassen */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Mitarbeiterdaten erfassen</h2>
            <p className="text-sm text-muted-foreground">
              Lege den neuen Mitarbeiter an. Du kannst in dieser Session mehrere Mitarbeiter für
              diese Stelle hinzufügen.
            </p>
          </div>

          {/* Infobox ausgewählte Stelle */}
          {selectedStelle && (
            <div className="rounded-xl border bg-muted/40 p-4 space-y-3 overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconBriefcase size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {selectedStelle.fields.stelle_titel ?? '(Kein Titel)'}
                  </p>
                  {selectedAbteilung && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <IconBuildingSkyscraper size={13} className="shrink-0" />
                      <span className="truncate">
                        {selectedAbteilung.fields.abteilung_name}
                      </span>
                    </div>
                  )}
                  {(selectedStelle.fields.stelle_gehalt_min != null ||
                    selectedStelle.fields.stelle_gehalt_max != null) && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <IconCurrencyEuro size={13} className="shrink-0" />
                      <span>
                        {selectedStelle.fields.stelle_gehalt_min != null &&
                        selectedStelle.fields.stelle_gehalt_max != null
                          ? `${selectedStelle.fields.stelle_gehalt_min.toLocaleString('de-DE')} – ${selectedStelle.fields.stelle_gehalt_max.toLocaleString('de-DE')} €`
                          : selectedStelle.fields.stelle_gehalt_min != null
                          ? `ab ${selectedStelle.fields.stelle_gehalt_min.toLocaleString('de-DE')} €`
                          : `bis ${selectedStelle.fields.stelle_gehalt_max!.toLocaleString('de-DE')} €`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Live-Feedback: bereits hinzugefügte Mitarbeiter */}
          {neueMitarbeiter.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <IconCheck size={12} className="text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-700">
                  {neueMitarbeiter.length}{' '}
                  {neueMitarbeiter.length === 1 ? 'Mitarbeiter hinzugefügt' : 'Mitarbeiter hinzugefügt'}
                </p>
              </div>
              <div className="space-y-1.5">
                {neueMitarbeiter.map((ma) => {
                  const vertragsart = ma.fields.vertragsart;
                  const vertragsartLabel =
                    vertragsart && typeof vertragsart === 'object' && 'label' in vertragsart
                      ? (vertragsart as { key: string; label: string }).label
                      : typeof vertragsart === 'string'
                      ? vertragsart
                      : '';

                  return (
                    <div
                      key={ma.record_id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card overflow-hidden"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <IconUserPlus size={15} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {[ma.fields.vorname, ma.fields.nachname].filter(Boolean).join(' ') ||
                            '(Kein Name)'}
                        </p>
                        <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                          {ma.fields.email && (
                            <span className="truncate">{ma.fields.email}</span>
                          )}
                          {vertragsartLabel && <span>{vertragsartLabel}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Button: Neuen Mitarbeiter anlegen */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setMitarbeiterDialogOpen(true)}
          >
            <IconUserPlus size={16} />
            Neuen Mitarbeiter anlegen
          </Button>

          <MitarbeiterDialog
            open={mitarbeiterDialogOpen}
            onClose={() => setMitarbeiterDialogOpen(false)}
            onSubmit={handleMitarbeiterCreate}
            defaultValues={mitarbeiterDefaultValues}
            abteilungenList={abteilungen}
            stellenList={stellen}
            enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiter']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiter']}
          />

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={handleZurueck} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button onClick={handleAbschliessen} className="gap-2" disabled={neueMitarbeiter.length === 0}>
              Abschließen
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* SCHRITT 3: Zusammenfassung */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Onboarding abgeschlossen</h2>
            <p className="text-sm text-muted-foreground">
              Der Onboarding-Prozess wurde erfolgreich abgeschlossen.
            </p>
          </div>

          {/* Grüne Erfolgs-Karte */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 space-y-3 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <IconCheck size={20} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 text-sm truncate">
                  {selectedStelle?.fields.stelle_titel ?? '(Stelle)'}
                </p>
                {selectedAbteilung && (
                  <p className="text-xs text-green-700 truncate">
                    {selectedAbteilung.fields.abteilung_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-700">
              <IconUserPlus size={16} className="shrink-0" />
              <span>
                <span className="font-semibold">{neueMitarbeiter.length}</span>{' '}
                {neueMitarbeiter.length === 1
                  ? 'neuer Mitarbeiter wurde angelegt'
                  : 'neue Mitarbeiter wurden angelegt'}
              </span>
            </div>
          </div>

          {/* Liste der neu erstellten Mitarbeiter */}
          {neueMitarbeiter.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Neu angelegte Mitarbeiter
              </h3>
              <div className="space-y-2">
                {neueMitarbeiter.map((ma) => {
                  const vertragsart = ma.fields.vertragsart;
                  const vertragsartLabel =
                    vertragsart && typeof vertragsart === 'object' && 'label' in vertragsart
                      ? (vertragsart as { key: string; label: string }).label
                      : typeof vertragsart === 'string'
                      ? vertragsart
                      : '';

                  return (
                    <div
                      key={ma.record_id}
                      className="flex items-start gap-3 p-4 rounded-xl border bg-card overflow-hidden"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <IconUserPlus size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="font-medium text-sm truncate">
                          {[ma.fields.vorname, ma.fields.nachname].filter(Boolean).join(' ') ||
                            '(Kein Name)'}
                        </p>
                        {ma.fields.email && (
                          <p className="text-xs text-muted-foreground truncate">{ma.fields.email}</p>
                        )}
                        {vertragsartLabel && (
                          <p className="text-xs text-muted-foreground">{vertragsartLabel}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aktions-Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleNeuesOnboarding}
            >
              <IconRefresh size={16} />
              Neues Onboarding starten
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => navigate('/')}
            >
              <IconHome size={16} />
              Zum Dashboard
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
