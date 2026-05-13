import type { Abwesenheiten, Leistungsbeurteilungen, Mitarbeiter, Stellen } from './app';

export type EnrichedStellen = Stellen & {
  stelle_abteilungName: string;
};

export type EnrichedMitarbeiter = Mitarbeiter & {
  ma_abteilungName: string;
  ma_stelleName: string;
};

export type EnrichedAbwesenheiten = Abwesenheiten & {
  abw_mitarbeiterName: string;
};

export type EnrichedLeistungsbeurteilungen = Leistungsbeurteilungen & {
  lb_mitarbeiterName: string;
};
