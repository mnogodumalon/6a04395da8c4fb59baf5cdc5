import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichStellen, enrichMitarbeiter, enrichAbwesenheiten, enrichLeistungsbeurteilungen } from '@/lib/enrich';
import type { EnrichedMitarbeiter, EnrichedAbwesenheiten } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconUsers, IconBriefcase, IconBuilding, IconCalendarOff, IconStar, IconSearch, IconX, IconChevronRight, IconUserPlus, IconClipboardCheck, IconList, IconLayoutKanban } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MitarbeiterDialog } from '@/components/dialogs/MitarbeiterDialog';
import { AbwesenheitenDialog } from '@/components/dialogs/AbwesenheitenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a04395da8c4fb59baf5cdc5';
const REPAIR_ENDPOINT = '/claude/build/repair';

const STATUS_COLORS: Record<string, string> = {
  aktiv: 'bg-green-500/10 text-green-700 border-green-200',
  inaktiv: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  probezeit: 'bg-amber-500/10 text-amber-700 border-amber-200',
  gekuendigt: 'bg-red-500/10 text-red-600 border-red-200',
  elternzeit: 'bg-purple-500/10 text-purple-700 border-purple-200',
};

const ABW_COLORS: Record<string, string> = {
  urlaub: 'bg-blue-100 text-blue-700',
  krankheit: 'bg-red-100 text-red-700',
  homeoffice: 'bg-teal-100 text-teal-700',
  fortbildung: 'bg-violet-100 text-violet-700',
  elternzeit: 'bg-purple-100 text-purple-700',
  sonderurlaub: 'bg-orange-100 text-orange-700',
  sonstiges: 'bg-zinc-100 text-zinc-600',
};

function getInitials(vorname?: string, nachname?: string) {
  return `${(vorname?.[0] ?? '').toUpperCase()}${(nachname?.[0] ?? '').toUpperCase()}`;
}

function AvatarCircle({ vorname, nachname, foto, size = 'md' }: { vorname?: string; nachname?: string; foto?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';
  if (foto) {
    return <img src={foto} alt="" className={`${sz} rounded-full object-cover shrink-0 border border-border`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0`}>
      {getInitials(vorname, nachname)}
    </div>
  );
}

export default function DashboardOverview() {
  const {
    abteilungen, stellen, mitarbeiter, abwesenheiten, leistungsbeurteilungen,
    abteilungenMap, stellenMap, mitarbeiterMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedStellen = enrichStellen(stellen, { abteilungenMap });
  const enrichedMitarbeiter = enrichMitarbeiter(mitarbeiter, { abteilungenMap, stellenMap });
  const enrichedAbwesenheiten = enrichAbwesenheiten(abwesenheiten, { mitarbeiterMap });
  const enrichedLeistungsbeurteilungen = enrichLeistungsbeurteilungen(leistungsbeurteilungen, { mitarbeiterMap });

  const [search, setSearch] = useState('');
  const [selectedAbteilung, setSelectedAbteilung] = useState<string | null>(null);
  const [selectedMa, setSelectedMa] = useState<EnrichedMitarbeiter | null>(null);
  const [maDialogOpen, setMaDialogOpen] = useState(false);
  const [editMa, setEditMa] = useState<EnrichedMitarbeiter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [abwDialogOpen, setAbwDialogOpen] = useState(false);
  const [editAbw, setEditAbw] = useState<EnrichedAbwesenheiten | null>(null);
  const [deleteAbwTarget, setDeleteAbwTarget] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mitarbeiter' | 'abwesenheiten'>('mitarbeiter');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filteredMa = useMemo(() => {
    let list = enrichedMitarbeiter;
    if (selectedAbteilung) {
      list = list.filter(m => {
        const abtId = m.fields.ma_abteilung?.split('/').pop();
        return abtId === selectedAbteilung;
      });
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(m =>
        `${m.fields.vorname} ${m.fields.nachname}`.toLowerCase().includes(s) ||
        (m.fields.email ?? '').toLowerCase().includes(s) ||
        (m.fields.mitarbeiter_nr ?? '').toLowerCase().includes(s)
      );
    }
    return list;
  }, [enrichedMitarbeiter, selectedAbteilung, search]);

  const pendingAbwesenheiten = useMemo(() =>
    enrichedAbwesenheiten.filter(a => a.fields.abw_status?.key === 'beantragt'),
    [enrichedAbwesenheiten]
  );

  const activeAbwesenheiten = useMemo(() =>
    enrichedAbwesenheiten.filter(a => {
      const von = a.fields.abw_von ?? '';
      const bis = a.fields.abw_bis ?? today;
      return von <= today && today <= bis;
    }),
    [enrichedAbwesenheiten, today]
  );

  const maByAbteilung = useMemo(() => {
    const map: Record<string, EnrichedMitarbeiter[]> = {};
    for (const ma of filteredMa) {
      const abtId = ma.fields.ma_abteilung?.split('/').pop() ?? '__keine__';
      if (!map[abtId]) map[abtId] = [];
      map[abtId].push(ma);
    }
    return map;
  }, [filteredMa]);

  const aktiveMA = useMemo(() =>
    enrichedMitarbeiter.filter(m => m.fields.beschaeftigungsstatus?.key === 'aktiv').length,
    [enrichedMitarbeiter]
  );

  const offeneStellen = useMemo(() =>
    enrichedStellen.filter(s => !s.fields.stelle_beschaeftigungsart || true).length,
    [enrichedStellen]
  );

  const maAbwToday = useMemo(() => {
    const ids = new Set(activeAbwesenheiten.map(a => a.fields.abw_mitarbeiter?.split('/').pop()));
    return enrichedMitarbeiter.filter(m => ids.has(m.record_id));
  }, [activeAbwesenheiten, enrichedMitarbeiter]);

  const handleDeleteMa = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteMitarbeiterEntry(deleteTarget);
    fetchAll();
    setDeleteTarget(null);
    if (selectedMa?.record_id === deleteTarget) setSelectedMa(null);
  };

  const handleStatusUpdate = async (id: string, statusKey: string, statusLabel: string) => {
    await LivingAppsService.updateMitarbeiterEntry(id, { beschaeftigungsstatus: { key: statusKey, label: statusLabel } } as Parameters<typeof LivingAppsService.updateMitarbeiterEntry>[1]);
    fetchAll();
  };

  const handleDeleteAbw = async () => {
    if (!deleteAbwTarget) return;
    await LivingAppsService.deleteAbwesenheitenEntry(deleteAbwTarget);
    fetchAll();
    setDeleteAbwTarget(null);
  };

  const maAbwesenheiten = useMemo(() => {
    if (!selectedMa) return [];
    return enrichedAbwesenheiten.filter(a =>
      a.fields.abw_mitarbeiter?.split('/').pop() === selectedMa.record_id
    );
  }, [enrichedAbwesenheiten, selectedMa]);

  const maBeurteilungen = useMemo(() => {
    if (!selectedMa) return [];
    return enrichedLeistungsbeurteilungen.filter(lb =>
      lb.fields.lb_mitarbeiter?.split('/').pop() === selectedMa.record_id
    );
  }, [enrichedLeistungsbeurteilungen, selectedMa]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Intent Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a href="#/intents/mitarbeiter-onboarding" className="group flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconUserPlus size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">Mitarbeiter onboarden</div>
            <div className="text-xs text-muted-foreground truncate">Stelle wählen · Mitarbeiter anlegen · Abschluss</div>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
        <a href="#/intents/leistungsbeurteilung" className="group flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <IconClipboardCheck size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">Leistungsbeurteilung durchführen</div>
            <div className="text-xs text-muted-foreground truncate">Mitarbeiter wählen · Beurteilung erfassen · Zusammenfassung</div>
          </div>
          <IconChevronRight size={16} className="text-muted-foreground shrink-0" />
        </a>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Mitarbeiter"
          value={String(enrichedMitarbeiter.length)}
          description={`${aktiveMA} aktiv`}
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Abteilungen"
          value={String(abteilungen.length)}
          description="insgesamt"
          icon={<IconBuilding size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Offene Stellen"
          value={String(offeneStellen)}
          description="ausgeschrieben"
          icon={<IconBriefcase size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Abwesenheiten"
          value={String(pendingAbwesenheiten.length)}
          description="ausstehend"
          icon={<IconCalendarOff size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Heute abwesend Banner */}
      {maAbwToday.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-amber-700 shrink-0">Heute abwesend:</span>
          <div className="flex flex-wrap gap-2">
            {maAbwToday.map(ma => {
              const abw = activeAbwesenheiten.find(a => a.fields.abw_mitarbeiter?.split('/').pop() === ma.record_id);
              const artKey = abw?.fields.abw_art?.key ?? 'sonstiges';
              return (
                <span key={ma.record_id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ABW_COLORS[artKey] ?? ABW_COLORS.sonstiges}`}>
                  {ma.fields.vorname} {ma.fields.nachname}
                  <span className="opacity-60">· {abw?.fields.abw_art?.label ?? '—'}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Layout: list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Mitarbeiter List */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {/* Tabs + Actions */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-2 flex-wrap border-b border-border">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('mitarbeiter')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'mitarbeiter' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                Mitarbeiter
              </button>
              <button
                onClick={() => setActiveTab('abwesenheiten')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors relative ${activeTab === 'abwesenheiten' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                Abwesenheiten
                {pendingAbwesenheiten.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingAbwesenheiten.length}
                  </span>
                )}
              </button>
            </div>
            {activeTab === 'mitarbeiter' && (
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Listenansicht"
                >
                  <IconList size={15} className="shrink-0" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Kanban-Ansicht"
                >
                  <IconLayoutKanban size={15} className="shrink-0" />
                </button>
              </div>
            )}
          {activeTab === 'mitarbeiter' ? (
              <Button size="sm" onClick={() => { setEditMa(null); setMaDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1 shrink-0" />Mitarbeiter
              </Button>
            ) : (
              <Button size="sm" onClick={() => { setEditAbw(null); setAbwDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1 shrink-0" />Abwesenheit
              </Button>
            )}
          </div>

          {activeTab === 'mitarbeiter' && viewMode === 'kanban' && (
            <KanbanBoard
              mitarbeiter={filteredMa}
              search={search}
              setSearch={setSearch}
              selectedAbteilung={selectedAbteilung}
              setSelectedAbteilung={setSelectedAbteilung}
              abteilungen={abteilungen}
              maAbwToday={maAbwToday}
              onEdit={(ma) => { setEditMa(ma); setMaDialogOpen(true); }}
              onDelete={(id) => setDeleteTarget(id)}
              onSelect={(ma) => setSelectedMa(ma)}
              selectedId={selectedMa?.record_id}
              onUpdateStatus={handleStatusUpdate}
            />
          )}

          {activeTab === 'mitarbeiter' && viewMode === 'list' && (
            <>
              {/* Search + Abteilung Filter */}
              <div className="px-4 py-2 flex gap-2 flex-wrap border-b border-border">
                <div className="relative flex-1 min-w-0">
                  <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Suchen…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => setSelectedAbteilung(null)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${!selectedAbteilung ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                  >
                    Alle
                  </button>
                  {abteilungen.map(abt => (
                    <button
                      key={abt.record_id}
                      onClick={() => setSelectedAbteilung(abt.record_id === selectedAbteilung ? null : abt.record_id)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${selectedAbteilung === abt.record_id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
                    >
                      {abt.fields.abteilung_kuerzel ?? abt.fields.abteilung_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* MA List grouped by Abteilung */}
              <div className="flex-1 overflow-y-auto max-h-[420px]">
                {filteredMa.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                    <IconUsers size={40} stroke={1.5} />
                    <span className="text-sm">Keine Mitarbeiter gefunden</span>
                    <Button size="sm" variant="outline" onClick={() => { setSearch(''); setSelectedAbteilung(null); }}>Filter zurücksetzen</Button>
                  </div>
                ) : (
                  Object.entries(maByAbteilung).map(([abtId, maList]) => {
                    const abt = abtId === '__keine__' ? null : abteilungenMap.get(abtId);
                    return (
                      <div key={abtId}>
                        <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 border-b border-border">
                          {abt ? (abt.fields.abteilung_name ?? '—') : 'Keine Abteilung'}
                          <span className="ml-1 text-muted-foreground/60">({maList.length})</span>
                        </div>
                        {maList.map(ma => {
                          const isAbwesend = maAbwToday.some(m => m.record_id === ma.record_id);
                          const statusKey = ma.fields.beschaeftigungsstatus?.key ?? '';
                          const isSelected = selectedMa?.record_id === ma.record_id;
                          return (
                            <button
                              key={ma.record_id}
                              onClick={() => setSelectedMa(isSelected ? null : ma)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border/50 last:border-0 ${isSelected ? 'bg-primary/5' : 'hover:bg-accent/50'}`}
                            >
                              <AvatarCircle vorname={ma.fields.vorname} nachname={ma.fields.nachname} foto={ma.fields.ma_foto} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-sm font-medium truncate">{ma.fields.vorname} {ma.fields.nachname}</span>
                                  {isAbwesend && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0">abwesend</span>}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {ma.fields.email ?? ma.fields.mitarbeiter_nr ?? '—'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {statusKey && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STATUS_COLORS[statusKey] ?? 'bg-zinc-100 text-zinc-500'}`}>
                                    {ma.fields.beschaeftigungsstatus?.label}
                                  </span>
                                )}
                                <IconChevronRight size={14} className={`text-muted-foreground/50 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}


          {activeTab === 'abwesenheiten' && (
            <div className="flex-1 overflow-y-auto max-h-[480px]">
              {enrichedAbwesenheiten.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <IconCalendarOff size={40} stroke={1.5} />
                  <span className="text-sm">Keine Abwesenheiten</span>
                </div>
              ) : (
                <div>
                  {pendingAbwesenheiten.length > 0 && (
                    <div className="px-4 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border-b border-amber-100">
                      Ausstehend ({pendingAbwesenheiten.length})
                    </div>
                  )}
                  {[...pendingAbwesenheiten, ...enrichedAbwesenheiten.filter(a => a.fields.abw_status?.key !== 'beantragt')].map(abw => {
                    const artKey = abw.fields.abw_art?.key ?? 'sonstiges';
                    const statusKey = abw.fields.abw_status?.key ?? '';
                    const maName = abw.abw_mitarbeiterName ?? '—';
                    return (
                      <div key={abw.record_id} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${ABW_COLORS[artKey]?.includes('blue') ? 'bg-blue-400' : ABW_COLORS[artKey]?.includes('red') ? 'bg-red-400' : ABW_COLORS[artKey]?.includes('teal') ? 'bg-teal-400' : 'bg-zinc-300'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{maName}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ABW_COLORS[artKey] ?? ABW_COLORS.sonstiges}`}>
                              {abw.fields.abw_art?.label ?? '—'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(abw.fields.abw_von)} – {formatDate(abw.fields.abw_bis)}
                            {abw.fields.abw_grund && <span className="ml-1 opacity-70">· {abw.fields.abw_grund}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {statusKey && (
                            <Badge variant="outline" className={`text-[10px] ${statusKey === 'genehmigt' ? 'border-green-200 bg-green-50 text-green-700' : statusKey === 'beantragt' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-600'}`}>
                              {abw.fields.abw_status?.label}
                            </Badge>
                          )}
                          <button
                            onClick={() => { setEditAbw(abw); setAbwDialogOpen(true); }}
                            className="p-1 rounded hover:bg-accent text-muted-foreground"
                          >
                            <IconPencil size={13} className="shrink-0" />
                          </button>
                          <button
                            onClick={() => setDeleteAbwTarget(abw.record_id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <IconTrash size={13} className="shrink-0" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {selectedMa ? (
            <MitarbeiterDetail
              ma={selectedMa}
              abwesenheiten={maAbwesenheiten}
              beurteilungen={maBeurteilungen.length}
              onEdit={() => { setEditMa(selectedMa); setMaDialogOpen(true); }}
              onDelete={() => setDeleteTarget(selectedMa.record_id)}
              onClose={() => setSelectedMa(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3 text-muted-foreground">
              <IconUsers size={40} stroke={1.5} />
              <p className="text-sm text-center px-4">Mitarbeiter auswählen<br />für Details</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <MitarbeiterDialog
        open={maDialogOpen}
        onClose={() => { setMaDialogOpen(false); setEditMa(null); }}
        onSubmit={async (fields) => {
          if (editMa) {
            await LivingAppsService.updateMitarbeiterEntry(editMa.record_id, fields);
          } else {
            await LivingAppsService.createMitarbeiterEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editMa?.fields}
        abteilungenList={abteilungen}
        stellenList={stellen}
        enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiter']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiter']}
      />

      <AbwesenheitenDialog
        open={abwDialogOpen}
        onClose={() => { setAbwDialogOpen(false); setEditAbw(null); }}
        onSubmit={async (fields) => {
          if (editAbw) {
            await LivingAppsService.updateAbwesenheitenEntry(editAbw.record_id, fields);
          } else {
            await LivingAppsService.createAbwesenheitenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editAbw ? editAbw.fields : (selectedMa ? { abw_mitarbeiter: createRecordUrl(APP_IDS.MITARBEITER, selectedMa.record_id) } : undefined)}
        mitarbeiterList={mitarbeiter}
        enablePhotoScan={AI_PHOTO_SCAN['Abwesenheiten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Abwesenheiten']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Mitarbeiter löschen"
        description="Diesen Mitarbeiter wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        onConfirm={handleDeleteMa}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteAbwTarget}
        title="Abwesenheit löschen"
        description="Diese Abwesenheit wirklich löschen?"
        onConfirm={handleDeleteAbw}
        onClose={() => setDeleteAbwTarget(null)}
      />
    </div>
  );
}

const KANBAN_COLUMNS = [
  { key: 'aktiv', label: 'Aktiv' },
  { key: 'probezeit', label: 'Probezeit' },
  { key: 'elternzeit', label: 'Elternzeit' },
  { key: 'inaktiv', label: 'Inaktiv' },
  { key: 'gekuendigt', label: 'Gekündigt' },
];

interface KanbanBoardProps {
  mitarbeiter: EnrichedMitarbeiter[];
  search: string;
  setSearch: (v: string) => void;
  selectedAbteilung: string | null;
  setSelectedAbteilung: (v: string | null) => void;
  abteilungen: { record_id: string; fields: { abteilung_name?: string; abteilung_kuerzel?: string } }[];
  maAbwToday: EnrichedMitarbeiter[];
  onEdit: (ma: EnrichedMitarbeiter) => void;
  onDelete: (id: string) => void;
  onSelect: (ma: EnrichedMitarbeiter) => void;
  selectedId: string | undefined;
  onUpdateStatus: (id: string, statusKey: string, statusLabel: string) => void;
}

function KanbanBoard({ mitarbeiter, search, setSearch, selectedAbteilung, setSelectedAbteilung, abteilungen, maAbwToday, onEdit, onDelete, onSelect, selectedId, onUpdateStatus }: KanbanBoardProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragSourceCol, setDragSourceCol] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const map: Record<string, EnrichedMitarbeiter[]> = {};
    for (const col of KANBAN_COLUMNS) map[col.key] = [];
    map['__sonstiges__'] = [];
    for (const ma of mitarbeiter) {
      const key = ma.fields.beschaeftigungsstatus?.key ?? '';
      if (map[key] !== undefined) {
        map[key].push(ma);
      } else {
        map['__sonstiges__'].push(ma);
      }
    }
    return map;
  }, [mitarbeiter]);

  const allCols = [
    ...KANBAN_COLUMNS,
    ...(byStatus['__sonstiges__'].length > 0 ? [{ key: '__sonstiges__', label: 'Sonstige' }] : []),
  ];

  const handleDragStart = (e: React.DragEvent, ma: EnrichedMitarbeiter, colKey: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ma.record_id);
    setDragId(ma.record_id);
    setDragSourceCol(colKey);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragSourceCol(null);
    setDragOverCol(null);
  };

  const handleDrop = (e: React.DragEvent, col: { key: string; label: string }) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id && dragSourceCol !== col.key && col.key !== '__sonstiges__') {
      onUpdateStatus(id, col.key, col.label);
    }
    setDragId(null);
    setDragSourceCol(null);
    setDragOverCol(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Search + Filter */}
      <div className="px-4 py-2 flex gap-2 flex-wrap border-b border-border">
        <div className="relative flex-1 min-w-0">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <Input
            placeholder="Suchen…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedAbteilung(null)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${!selectedAbteilung ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
          >
            Alle
          </button>
          {abteilungen.map(abt => (
            <button
              key={abt.record_id}
              onClick={() => setSelectedAbteilung(abt.record_id === selectedAbteilung ? null : abt.record_id)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${selectedAbteilung === abt.record_id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
            >
              {abt.fields.abteilung_kuerzel ?? abt.fields.abteilung_name}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-3 h-full" style={{ minWidth: `${allCols.length * 220}px` }}>
          {allCols.map(col => {
            const cards = byStatus[col.key] ?? [];
            const isDropTarget = dragOverCol === col.key && dragSourceCol !== col.key && col.key !== '__sonstiges__';
            return (
              <div
                key={col.key}
                className={`flex flex-col rounded-xl border bg-muted/30 overflow-hidden shrink-0 transition-all ${isDropTarget ? 'border-primary shadow-md bg-primary/5' : 'border-border'}`}
                style={{ width: '200px' }}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                onDrop={e => handleDrop(e, col)}
              >
                {/* Column Header */}
                <div className={`px-3 py-2 flex items-center gap-2 border-b bg-card ${isDropTarget ? 'border-primary/30' : 'border-border'}`}>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[col.key]?.includes('green') ? 'bg-green-500' : STATUS_COLORS[col.key]?.includes('amber') ? 'bg-amber-500' : STATUS_COLORS[col.key]?.includes('red') ? 'bg-red-500' : STATUS_COLORS[col.key]?.includes('purple') ? 'bg-purple-500' : 'bg-zinc-400'}`} />
                  <span className="text-xs font-semibold text-foreground truncate flex-1">{col.label}</span>
                  <span className="text-xs text-muted-foreground font-medium shrink-0">{cards.length}</span>
                </div>
                {/* Drop hint */}
                {isDropTarget && (
                  <div className="mx-2 mt-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 py-3 flex items-center justify-center">
                    <span className="text-[10px] text-primary font-medium">Hier ablegen</span>
                  </div>
                )}
                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[340px]">
                  {cards.length === 0 && !isDropTarget ? (
                    <div className="flex items-center justify-center py-6 text-muted-foreground/50">
                      <span className="text-xs">Leer</span>
                    </div>
                  ) : (
                    cards.map(ma => {
                      const isAbwesend = maAbwToday.some(m => m.record_id === ma.record_id);
                      const isSelected = selectedId === ma.record_id;
                      const isDragging = dragId === ma.record_id;
                      return (
                        <div
                          key={ma.record_id}
                          draggable
                          onDragStart={e => handleDragStart(e, ma, col.key)}
                          onDragEnd={handleDragEnd}
                          className={`rounded-lg border bg-card p-2.5 transition-all select-none ${isDragging ? 'opacity-40 scale-95 cursor-grabbing' : 'cursor-grab'} ${isSelected ? 'border-primary shadow-sm' : 'border-border hover:border-primary/40 hover:shadow-sm'}`}
                          onClick={() => !isDragging && onSelect(ma)}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <AvatarCircle vorname={ma.fields.vorname} nachname={ma.fields.nachname} foto={ma.fields.ma_foto} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate">{ma.fields.vorname} {ma.fields.nachname}</div>
                              {ma.ma_abteilungName && <div className="text-[10px] text-muted-foreground truncate">{ma.ma_abteilungName}</div>}
                            </div>
                          </div>
                          {ma.ma_stelleName && (
                            <div className="text-[10px] text-muted-foreground truncate mb-1.5">{ma.ma_stelleName}</div>
                          )}
                          {isAbwesend && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">abwesend</span>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1.5 pt-1.5 border-t border-border/50">
                            <button
                              onClick={e => { e.stopPropagation(); onEdit(ma); }}
                              className="p-1 rounded hover:bg-accent text-muted-foreground"
                            >
                              <IconPencil size={12} className="shrink-0" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); onDelete(ma.record_id); }}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <IconTrash size={12} className="shrink-0" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface MitarbeiterDetailProps {
  ma: EnrichedMitarbeiter;
  abwesenheiten: EnrichedAbwesenheiten[];
  beurteilungen: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function MitarbeiterDetail({ ma, abwesenheiten, beurteilungen, onEdit, onDelete, onClose }: MitarbeiterDetailProps) {
  const statusKey = ma.fields.beschaeftigungsstatus?.key ?? '';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-3">
          <button onClick={onClose} className="p-1 rounded hover:bg-accent text-muted-foreground ml-auto shrink-0">
            <IconX size={14} className="shrink-0" />
          </button>
        </div>
        <div className="flex flex-col items-center text-center gap-2">
          <AvatarCircle vorname={ma.fields.vorname} nachname={ma.fields.nachname} foto={ma.fields.ma_foto} size="lg" />
          <div>
            <h3 className="font-semibold text-foreground">{ma.fields.vorname} {ma.fields.nachname}</h3>
            {ma.ma_abteilungName && <p className="text-xs text-muted-foreground">{ma.ma_abteilungName}</p>}
            {ma.ma_stelleName && <p className="text-xs text-muted-foreground">{ma.ma_stelleName}</p>}
          </div>
          {statusKey && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[statusKey] ?? 'bg-zinc-100 text-zinc-500'}`}>
              {ma.fields.beschaeftigungsstatus?.label}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="space-y-2">
          {ma.fields.email && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs w-20 shrink-0">E-Mail</span>
              <a href={`mailto:${ma.fields.email}`} className="truncate text-primary hover:underline text-xs">{ma.fields.email}</a>
            </div>
          )}
          {ma.fields.telefon && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs w-20 shrink-0">Telefon</span>
              <span className="text-xs truncate">{ma.fields.telefon}</span>
            </div>
          )}
          {ma.fields.eintrittsdatum && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs w-20 shrink-0">Eintritt</span>
              <span className="text-xs">{formatDate(ma.fields.eintrittsdatum)}</span>
            </div>
          )}
          {ma.fields.vertragsart && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs w-20 shrink-0">Vertrag</span>
              <span className="text-xs">{ma.fields.vertragsart.label}</span>
            </div>
          )}
          {ma.fields.mitarbeiter_nr && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs w-20 shrink-0">Nr.</span>
              <span className="text-xs font-mono">{ma.fields.mitarbeiter_nr}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <div className="text-lg font-bold text-foreground">{abwesenheiten.length}</div>
            <div className="text-[10px] text-muted-foreground">Abwesenheiten</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <div className="text-lg font-bold text-foreground flex items-center justify-center gap-0.5">
              {beurteilungen}
              {beurteilungen > 0 && <IconStar size={12} className="text-amber-500 shrink-0" />}
            </div>
            <div className="text-[10px] text-muted-foreground">Beurteilungen</div>
          </div>
        </div>

        {/* Recent Abwesenheiten */}
        {abwesenheiten.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1.5">Letzte Abwesenheiten</div>
            <div className="space-y-1">
              {abwesenheiten.slice(0, 3).map(abw => {
                const artKey = abw.fields.abw_art?.key ?? 'sonstiges';
                return (
                  <div key={abw.record_id} className="flex items-center gap-2 text-xs">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ABW_COLORS[artKey] ?? ABW_COLORS.sonstiges}`}>
                      {abw.fields.abw_art?.label}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {formatDate(abw.fields.abw_von)} – {formatDate(abw.fields.abw_bis)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {ma.fields.ma_notizen && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">Notizen</div>
            <p className="text-xs text-muted-foreground line-clamp-3">{ma.fields.ma_notizen}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-border flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
          <IconPencil size={13} className="mr-1 shrink-0" />Bearbeiten
        </Button>
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive hover:border-destructive/40" onClick={onDelete}>
          <IconTrash size={13} className="shrink-0" />
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
