import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Abteilungen, Stellen, Mitarbeiter, Abwesenheiten, Leistungsbeurteilungen } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [abteilungen, setAbteilungen] = useState<Abteilungen[]>([]);
  const [stellen, setStellen] = useState<Stellen[]>([]);
  const [mitarbeiter, setMitarbeiter] = useState<Mitarbeiter[]>([]);
  const [abwesenheiten, setAbwesenheiten] = useState<Abwesenheiten[]>([]);
  const [leistungsbeurteilungen, setLeistungsbeurteilungen] = useState<Leistungsbeurteilungen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [abteilungenData, stellenData, mitarbeiterData, abwesenheitenData, leistungsbeurteilungenData] = await Promise.all([
        LivingAppsService.getAbteilungen(),
        LivingAppsService.getStellen(),
        LivingAppsService.getMitarbeiter(),
        LivingAppsService.getAbwesenheiten(),
        LivingAppsService.getLeistungsbeurteilungen(),
      ]);
      setAbteilungen(abteilungenData);
      setStellen(stellenData);
      setMitarbeiter(mitarbeiterData);
      setAbwesenheiten(abwesenheitenData);
      setLeistungsbeurteilungen(leistungsbeurteilungenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [abteilungenData, stellenData, mitarbeiterData, abwesenheitenData, leistungsbeurteilungenData] = await Promise.all([
          LivingAppsService.getAbteilungen(),
          LivingAppsService.getStellen(),
          LivingAppsService.getMitarbeiter(),
          LivingAppsService.getAbwesenheiten(),
          LivingAppsService.getLeistungsbeurteilungen(),
        ]);
        setAbteilungen(abteilungenData);
        setStellen(stellenData);
        setMitarbeiter(mitarbeiterData);
        setAbwesenheiten(abwesenheitenData);
        setLeistungsbeurteilungen(leistungsbeurteilungenData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const abteilungenMap = useMemo(() => {
    const m = new Map<string, Abteilungen>();
    abteilungen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [abteilungen]);

  const stellenMap = useMemo(() => {
    const m = new Map<string, Stellen>();
    stellen.forEach(r => m.set(r.record_id, r));
    return m;
  }, [stellen]);

  const mitarbeiterMap = useMemo(() => {
    const m = new Map<string, Mitarbeiter>();
    mitarbeiter.forEach(r => m.set(r.record_id, r));
    return m;
  }, [mitarbeiter]);

  return { abteilungen, setAbteilungen, stellen, setStellen, mitarbeiter, setMitarbeiter, abwesenheiten, setAbwesenheiten, leistungsbeurteilungen, setLeistungsbeurteilungen, loading, error, fetchAll, abteilungenMap, stellenMap, mitarbeiterMap };
}