import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Abteilungen, Stellen, Mitarbeiter, Abwesenheiten, Leistungsbeurteilungen } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { AbteilungenDialog } from '@/components/dialogs/AbteilungenDialog';
import { AbteilungenViewDialog } from '@/components/dialogs/AbteilungenViewDialog';
import { StellenDialog } from '@/components/dialogs/StellenDialog';
import { StellenViewDialog } from '@/components/dialogs/StellenViewDialog';
import { MitarbeiterDialog } from '@/components/dialogs/MitarbeiterDialog';
import { MitarbeiterViewDialog } from '@/components/dialogs/MitarbeiterViewDialog';
import { AbwesenheitenDialog } from '@/components/dialogs/AbwesenheitenDialog';
import { AbwesenheitenViewDialog } from '@/components/dialogs/AbwesenheitenViewDialog';
import { LeistungsbeurteilungenDialog } from '@/components/dialogs/LeistungsbeurteilungenDialog';
import { LeistungsbeurteilungenViewDialog } from '@/components/dialogs/LeistungsbeurteilungenViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const ABTEILUNGEN_FIELDS = [
  { key: 'abteilung_name', label: 'Abteilungsname', type: 'string/text' },
  { key: 'abteilung_kuerzel', label: 'Kürzel', type: 'string/text' },
  { key: 'abteilung_beschreibung', label: 'Beschreibung', type: 'string/textarea' },
  { key: 'abteilung_leiter_vorname', label: 'Abteilungsleiter Vorname', type: 'string/text' },
  { key: 'abteilung_leiter_nachname', label: 'Abteilungsleiter Nachname', type: 'string/text' },
  { key: 'abteilung_standort', label: 'Standort', type: 'string/text' },
  { key: 'abteilung_telefon', label: 'Telefon', type: 'string/tel' },
];
const STELLEN_FIELDS = [
  { key: 'stelle_titel', label: 'Stellenbezeichnung', type: 'string/text' },
  { key: 'stelle_abteilung', label: 'Abteilung', type: 'applookup/select', targetEntity: 'abteilungen', targetAppId: 'ABTEILUNGEN', displayField: 'abteilung_name' },
  { key: 'stelle_beschreibung', label: 'Stellenbeschreibung', type: 'string/textarea' },
  { key: 'stelle_beschaeftigungsart', label: 'Beschäftigungsart', type: 'lookup/select', options: [{ key: 'teilzeit', label: 'Teilzeit' }, { key: 'minijob', label: 'Minijob' }, { key: 'praktikum', label: 'Praktikum' }, { key: 'werkstudent', label: 'Werkstudent' }, { key: 'freiberuflich', label: 'Freiberuflich' }, { key: 'vollzeit', label: 'Vollzeit' }] },
  { key: 'stelle_gehalt_min', label: 'Mindestgehalt (€)', type: 'number' },
  { key: 'stelle_gehalt_max', label: 'Maximalgehalt (€)', type: 'number' },
  { key: 'stelle_anforderungen', label: 'Anforderungen', type: 'string/textarea' },
];
const MITARBEITER_FIELDS = [
  { key: 'vorname', label: 'Vorname', type: 'string/text' },
  { key: 'nachname', label: 'Nachname', type: 'string/text' },
  { key: 'geburtsdatum', label: 'Geburtsdatum', type: 'date/date' },
  { key: 'geschlecht', label: 'Geschlecht', type: 'lookup/radio', options: [{ key: 'maennlich', label: 'Männlich' }, { key: 'weiblich', label: 'Weiblich' }, { key: 'divers', label: 'Divers' }] },
  { key: 'email', label: 'E-Mail-Adresse', type: 'string/email' },
  { key: 'telefon', label: 'Telefon', type: 'string/tel' },
  { key: 'strasse', label: 'Straße', type: 'string/text' },
  { key: 'hausnummer', label: 'Hausnummer', type: 'string/text' },
  { key: 'plz', label: 'Postleitzahl', type: 'string/text' },
  { key: 'ort', label: 'Ort', type: 'string/text' },
  { key: 'mitarbeiter_nr', label: 'Mitarbeiternummer', type: 'string/text' },
  { key: 'eintrittsdatum', label: 'Eintrittsdatum', type: 'date/date' },
  { key: 'beschaeftigungsstatus', label: 'Beschäftigungsstatus', type: 'lookup/select', options: [{ key: 'aktiv', label: 'Aktiv' }, { key: 'inaktiv', label: 'Inaktiv' }, { key: 'probezeit', label: 'In Probezeit' }, { key: 'gekuendigt', label: 'Gekündigt' }, { key: 'elternzeit', label: 'Elternzeit' }] },
  { key: 'vertragsart', label: 'Vertragsart', type: 'lookup/select', options: [{ key: 'unbefristet', label: 'Unbefristet' }, { key: 'befristet', label: 'Befristet' }, { key: 'minijob', label: 'Minijob' }, { key: 'praktikum', label: 'Praktikum' }, { key: 'werkstudent', label: 'Werkstudent' }] },
  { key: 'ma_abteilung', label: 'Abteilung', type: 'applookup/select', targetEntity: 'abteilungen', targetAppId: 'ABTEILUNGEN', displayField: 'abteilung_name' },
  { key: 'ma_stelle', label: 'Stelle', type: 'applookup/select', targetEntity: 'stellen', targetAppId: 'STELLEN', displayField: 'stelle_titel' },
  { key: 'ma_foto', label: 'Mitarbeiterfoto', type: 'file' },
  { key: 'ma_notizen', label: 'Notizen', type: 'string/textarea' },
];
const ABWESENHEITEN_FIELDS = [
  { key: 'abw_mitarbeiter', label: 'Mitarbeiter', type: 'applookup/select', targetEntity: 'mitarbeiter', targetAppId: 'MITARBEITER', displayField: 'vorname' },
  { key: 'abw_art', label: 'Abwesenheitsart', type: 'lookup/select', options: [{ key: 'urlaub', label: 'Urlaub' }, { key: 'krankheit', label: 'Krankheit' }, { key: 'elternzeit', label: 'Elternzeit' }, { key: 'sonderurlaub', label: 'Sonderurlaub' }, { key: 'fortbildung', label: 'Fortbildung' }, { key: 'homeoffice', label: 'Homeoffice' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'abw_von', label: 'Von (Datum)', type: 'date/date' },
  { key: 'abw_bis', label: 'Bis (Datum)', type: 'date/date' },
  { key: 'abw_grund', label: 'Begründung', type: 'string/textarea' },
  { key: 'abw_status', label: 'Status', type: 'lookup/radio', options: [{ key: 'beantragt', label: 'Beantragt' }, { key: 'genehmigt', label: 'Genehmigt' }, { key: 'abgelehnt', label: 'Abgelehnt' }] },
  { key: 'abw_genehmigt_von_vorname', label: 'Genehmigt von (Vorname)', type: 'string/text' },
  { key: 'abw_genehmigt_von_nachname', label: 'Genehmigt von (Nachname)', type: 'string/text' },
  { key: 'abw_bemerkung', label: 'Bemerkung', type: 'string/textarea' },
];
const LEISTUNGSBEURTEILUNGEN_FIELDS = [
  { key: 'lb_mitarbeiter', label: 'Mitarbeiter', type: 'applookup/select', targetEntity: 'mitarbeiter', targetAppId: 'MITARBEITER', displayField: 'vorname' },
  { key: 'lb_beurteilungszeitraum', label: 'Beurteilungszeitraum', type: 'string/text' },
  { key: 'lb_beurteiler_vorname', label: 'Beurteiler Vorname', type: 'string/text' },
  { key: 'lb_beurteiler_nachname', label: 'Beurteiler Nachname', type: 'string/text' },
  { key: 'lb_datum', label: 'Beurteilungsdatum', type: 'date/date' },
  { key: 'lb_fachkompetenz', label: 'Fachkompetenz', type: 'lookup/radio', options: [{ key: 'k1', label: '1 – Ungenügend' }, { key: 'k2', label: '2 – Verbesserungsbedarf' }, { key: 'k3', label: '3 – Entspricht Erwartungen' }, { key: 'k4', label: '4 – Übertrifft Erwartungen' }, { key: 'k5', label: '5 – Hervorragend' }] },
  { key: 'lb_teamarbeit', label: 'Teamarbeit', type: 'lookup/radio', options: [{ key: 't1', label: '1 – Ungenügend' }, { key: 't2', label: '2 – Verbesserungsbedarf' }, { key: 't3', label: '3 – Entspricht Erwartungen' }, { key: 't4', label: '4 – Übertrifft Erwartungen' }, { key: 't5', label: '5 – Hervorragend' }] },
  { key: 'lb_kommunikation', label: 'Kommunikation', type: 'lookup/radio', options: [{ key: 'c2', label: '2 – Verbesserungsbedarf' }, { key: 'c3', label: '3 – Entspricht Erwartungen' }, { key: 'c4', label: '4 – Übertrifft Erwartungen' }, { key: 'c5', label: '5 – Hervorragend' }, { key: 'c1', label: '1 – Ungenügend' }] },
  { key: 'lb_eigeninitiative', label: 'Eigeninitiative', type: 'lookup/radio', options: [{ key: 'e1', label: '1 – Ungenügend' }, { key: 'e2', label: '2 – Verbesserungsbedarf' }, { key: 'e3', label: '3 – Entspricht Erwartungen' }, { key: 'e4', label: '4 – Übertrifft Erwartungen' }, { key: 'e5', label: '5 – Hervorragend' }] },
  { key: 'lb_gesamtbewertung', label: 'Gesamtbewertung', type: 'lookup/select', options: [{ key: 'gesamt1', label: 'Ungenügend' }, { key: 'gesamt2', label: 'Verbesserungsbedarf' }, { key: 'gesamt3', label: 'Entspricht Erwartungen' }, { key: 'gesamt4', label: 'Übertrifft Erwartungen' }, { key: 'gesamt5', label: 'Hervorragend' }] },
  { key: 'lb_staerken', label: 'Stärken', type: 'string/textarea' },
  { key: 'lb_entwicklungsfelder', label: 'Entwicklungsfelder', type: 'string/textarea' },
  { key: 'lb_ziele', label: 'Ziele für den nächsten Zeitraum', type: 'string/textarea' },
  { key: 'lb_kommentar', label: 'Allgemeiner Kommentar', type: 'string/textarea' },
];

const ENTITY_TABS = [
  { key: 'abteilungen', label: 'Abteilungen', pascal: 'Abteilungen' },
  { key: 'stellen', label: 'Stellen', pascal: 'Stellen' },
  { key: 'mitarbeiter', label: 'Mitarbeiter', pascal: 'Mitarbeiter' },
  { key: 'abwesenheiten', label: 'Abwesenheiten', pascal: 'Abwesenheiten' },
  { key: 'leistungsbeurteilungen', label: 'Leistungsbeurteilungen', pascal: 'Leistungsbeurteilungen' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('abteilungen');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'abteilungen': new Set(),
    'stellen': new Set(),
    'mitarbeiter': new Set(),
    'abwesenheiten': new Set(),
    'leistungsbeurteilungen': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'abteilungen': {},
    'stellen': {},
    'mitarbeiter': {},
    'abwesenheiten': {},
    'leistungsbeurteilungen': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'abteilungen': return (data as any).abteilungen as Abteilungen[] ?? [];
      case 'stellen': return (data as any).stellen as Stellen[] ?? [];
      case 'mitarbeiter': return (data as any).mitarbeiter as Mitarbeiter[] ?? [];
      case 'abwesenheiten': return (data as any).abwesenheiten as Abwesenheiten[] ?? [];
      case 'leistungsbeurteilungen': return (data as any).leistungsbeurteilungen as Leistungsbeurteilungen[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'stellen':
        lists.abteilungenList = (data as any).abteilungen ?? [];
        break;
      case 'mitarbeiter':
        lists.abteilungenList = (data as any).abteilungen ?? [];
        lists.stellenList = (data as any).stellen ?? [];
        break;
      case 'abwesenheiten':
        lists.mitarbeiterList = (data as any).mitarbeiter ?? [];
        break;
      case 'leistungsbeurteilungen':
        lists.mitarbeiterList = (data as any).mitarbeiter ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'stellen' && fieldKey === 'stelle_abteilung') {
      const match = (lists.abteilungenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.abteilung_name ?? '—';
    }
    if (entity === 'mitarbeiter' && fieldKey === 'ma_abteilung') {
      const match = (lists.abteilungenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.abteilung_name ?? '—';
    }
    if (entity === 'mitarbeiter' && fieldKey === 'ma_stelle') {
      const match = (lists.stellenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.stelle_titel ?? '—';
    }
    if (entity === 'abwesenheiten' && fieldKey === 'abw_mitarbeiter') {
      const match = (lists.mitarbeiterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.vorname ?? '—';
    }
    if (entity === 'leistungsbeurteilungen' && fieldKey === 'lb_mitarbeiter') {
      const match = (lists.mitarbeiterList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.vorname ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'abteilungen': return ABTEILUNGEN_FIELDS;
      case 'stellen': return STELLEN_FIELDS;
      case 'mitarbeiter': return MITARBEITER_FIELDS;
      case 'abwesenheiten': return ABWESENHEITEN_FIELDS;
      case 'leistungsbeurteilungen': return LEISTUNGSBEURTEILUNGEN_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'abteilungen': return {
        create: (fields: any) => LivingAppsService.createAbteilungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateAbteilungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteAbteilungenEntry(id),
      };
      case 'stellen': return {
        create: (fields: any) => LivingAppsService.createStellenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateStellenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteStellenEntry(id),
      };
      case 'mitarbeiter': return {
        create: (fields: any) => LivingAppsService.createMitarbeiterEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateMitarbeiterEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteMitarbeiterEntry(id),
      };
      case 'abwesenheiten': return {
        create: (fields: any) => LivingAppsService.createAbwesenheitenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateAbwesenheitenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteAbwesenheitenEntry(id),
      };
      case 'leistungsbeurteilungen': return {
        create: (fields: any) => LivingAppsService.createLeistungsbeurteilungenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateLeistungsbeurteilungenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteLeistungsbeurteilungenEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'abteilungen' || dialogState?.entity === 'abteilungen') && (
        <AbteilungenDialog
          open={createEntity === 'abteilungen' || dialogState?.entity === 'abteilungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'abteilungen' ? handleUpdate : (fields: any) => handleCreate('abteilungen', fields)}
          defaultValues={dialogState?.entity === 'abteilungen' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Abteilungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Abteilungen']}
        />
      )}
      {(createEntity === 'stellen' || dialogState?.entity === 'stellen') && (
        <StellenDialog
          open={createEntity === 'stellen' || dialogState?.entity === 'stellen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'stellen' ? handleUpdate : (fields: any) => handleCreate('stellen', fields)}
          defaultValues={dialogState?.entity === 'stellen' ? dialogState.record?.fields : undefined}
          abteilungenList={(data as any).abteilungen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Stellen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Stellen']}
        />
      )}
      {(createEntity === 'mitarbeiter' || dialogState?.entity === 'mitarbeiter') && (
        <MitarbeiterDialog
          open={createEntity === 'mitarbeiter' || dialogState?.entity === 'mitarbeiter'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'mitarbeiter' ? handleUpdate : (fields: any) => handleCreate('mitarbeiter', fields)}
          defaultValues={dialogState?.entity === 'mitarbeiter' ? dialogState.record?.fields : undefined}
          abteilungenList={(data as any).abteilungen ?? []}
          stellenList={(data as any).stellen ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Mitarbeiter']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeiter']}
        />
      )}
      {(createEntity === 'abwesenheiten' || dialogState?.entity === 'abwesenheiten') && (
        <AbwesenheitenDialog
          open={createEntity === 'abwesenheiten' || dialogState?.entity === 'abwesenheiten'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'abwesenheiten' ? handleUpdate : (fields: any) => handleCreate('abwesenheiten', fields)}
          defaultValues={dialogState?.entity === 'abwesenheiten' ? dialogState.record?.fields : undefined}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Abwesenheiten']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Abwesenheiten']}
        />
      )}
      {(createEntity === 'leistungsbeurteilungen' || dialogState?.entity === 'leistungsbeurteilungen') && (
        <LeistungsbeurteilungenDialog
          open={createEntity === 'leistungsbeurteilungen' || dialogState?.entity === 'leistungsbeurteilungen'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'leistungsbeurteilungen' ? handleUpdate : (fields: any) => handleCreate('leistungsbeurteilungen', fields)}
          defaultValues={dialogState?.entity === 'leistungsbeurteilungen' ? dialogState.record?.fields : undefined}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Leistungsbeurteilungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Leistungsbeurteilungen']}
        />
      )}
      {viewState?.entity === 'abteilungen' && (
        <AbteilungenViewDialog
          open={viewState?.entity === 'abteilungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'abteilungen', record: r }); }}
        />
      )}
      {viewState?.entity === 'stellen' && (
        <StellenViewDialog
          open={viewState?.entity === 'stellen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'stellen', record: r }); }}
          abteilungenList={(data as any).abteilungen ?? []}
        />
      )}
      {viewState?.entity === 'mitarbeiter' && (
        <MitarbeiterViewDialog
          open={viewState?.entity === 'mitarbeiter'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'mitarbeiter', record: r }); }}
          abteilungenList={(data as any).abteilungen ?? []}
          stellenList={(data as any).stellen ?? []}
        />
      )}
      {viewState?.entity === 'abwesenheiten' && (
        <AbwesenheitenViewDialog
          open={viewState?.entity === 'abwesenheiten'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'abwesenheiten', record: r }); }}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
        />
      )}
      {viewState?.entity === 'leistungsbeurteilungen' && (
        <LeistungsbeurteilungenViewDialog
          open={viewState?.entity === 'leistungsbeurteilungen'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'leistungsbeurteilungen', record: r }); }}
          mitarbeiterList={(data as any).mitarbeiter ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}