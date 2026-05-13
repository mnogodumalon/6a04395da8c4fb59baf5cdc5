import type { EnrichedAbwesenheiten, EnrichedLeistungsbeurteilungen, EnrichedMitarbeiter, EnrichedStellen } from '@/types/enriched';
import type { Abteilungen, Abwesenheiten, Leistungsbeurteilungen, Mitarbeiter, Stellen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface StellenMaps {
  abteilungenMap: Map<string, Abteilungen>;
}

export function enrichStellen(
  stellen: Stellen[],
  maps: StellenMaps
): EnrichedStellen[] {
  return stellen.map(r => ({
    ...r,
    stelle_abteilungName: resolveDisplay(r.fields.stelle_abteilung, maps.abteilungenMap, 'abteilung_name'),
  }));
}

interface MitarbeiterMaps {
  abteilungenMap: Map<string, Abteilungen>;
  stellenMap: Map<string, Stellen>;
}

export function enrichMitarbeiter(
  mitarbeiter: Mitarbeiter[],
  maps: MitarbeiterMaps
): EnrichedMitarbeiter[] {
  return mitarbeiter.map(r => ({
    ...r,
    ma_abteilungName: resolveDisplay(r.fields.ma_abteilung, maps.abteilungenMap, 'abteilung_name'),
    ma_stelleName: resolveDisplay(r.fields.ma_stelle, maps.stellenMap, 'stelle_titel'),
  }));
}

interface AbwesenheitenMaps {
  mitarbeiterMap: Map<string, Mitarbeiter>;
}

export function enrichAbwesenheiten(
  abwesenheiten: Abwesenheiten[],
  maps: AbwesenheitenMaps
): EnrichedAbwesenheiten[] {
  return abwesenheiten.map(r => ({
    ...r,
    abw_mitarbeiterName: resolveDisplay(r.fields.abw_mitarbeiter, maps.mitarbeiterMap, 'vorname', 'nachname'),
  }));
}

interface LeistungsbeurteilungenMaps {
  mitarbeiterMap: Map<string, Mitarbeiter>;
}

export function enrichLeistungsbeurteilungen(
  leistungsbeurteilungen: Leistungsbeurteilungen[],
  maps: LeistungsbeurteilungenMaps
): EnrichedLeistungsbeurteilungen[] {
  return leistungsbeurteilungen.map(r => ({
    ...r,
    lb_mitarbeiterName: resolveDisplay(r.fields.lb_mitarbeiter, maps.mitarbeiterMap, 'vorname', 'nachname'),
  }));
}
