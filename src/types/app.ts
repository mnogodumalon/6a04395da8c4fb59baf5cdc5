// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Abteilungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    abteilung_name?: string;
    abteilung_kuerzel?: string;
    abteilung_beschreibung?: string;
    abteilung_leiter_vorname?: string;
    abteilung_leiter_nachname?: string;
    abteilung_standort?: string;
    abteilung_telefon?: string;
  };
}

export interface Stellen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    stelle_titel?: string;
    stelle_abteilung?: string; // applookup -> URL zu 'Abteilungen' Record
    stelle_beschreibung?: string;
    stelle_beschaeftigungsart?: LookupValue;
    stelle_gehalt_min?: number;
    stelle_gehalt_max?: number;
    stelle_anforderungen?: string;
  };
}

export interface Mitarbeiter {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geschlecht?: LookupValue;
    email?: string;
    telefon?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    mitarbeiter_nr?: string;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    beschaeftigungsstatus?: LookupValue;
    vertragsart?: LookupValue;
    ma_abteilung?: string; // applookup -> URL zu 'Abteilungen' Record
    ma_stelle?: string; // applookup -> URL zu 'Stellen' Record
    ma_foto?: string;
    ma_notizen?: string;
  };
}

export interface Abwesenheiten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    abw_mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiter' Record
    abw_art?: LookupValue;
    abw_von?: string; // Format: YYYY-MM-DD oder ISO String
    abw_bis?: string; // Format: YYYY-MM-DD oder ISO String
    abw_grund?: string;
    abw_status?: LookupValue;
    abw_genehmigt_von_vorname?: string;
    abw_genehmigt_von_nachname?: string;
    abw_bemerkung?: string;
  };
}

export interface Leistungsbeurteilungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    lb_mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiter' Record
    lb_beurteilungszeitraum?: string;
    lb_beurteiler_vorname?: string;
    lb_beurteiler_nachname?: string;
    lb_datum?: string; // Format: YYYY-MM-DD oder ISO String
    lb_fachkompetenz?: LookupValue;
    lb_teamarbeit?: LookupValue;
    lb_kommunikation?: LookupValue;
    lb_eigeninitiative?: LookupValue;
    lb_gesamtbewertung?: LookupValue;
    lb_staerken?: string;
    lb_entwicklungsfelder?: string;
    lb_ziele?: string;
    lb_kommentar?: string;
  };
}

export const APP_IDS = {
  ABTEILUNGEN: '6a04393196b6d0e1fe432568',
  STELLEN: '6a04393858a300b18cad58a9',
  MITARBEITER: '6a0439397a0c50347e1a18b3',
  ABWESENHEITEN: '6a04393b87d551873784e867',
  LEISTUNGSBEURTEILUNGEN: '6a04393ce2ed260f9576b292',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'stellen': {
    stelle_beschaeftigungsart: [{ key: "teilzeit", label: "Teilzeit" }, { key: "minijob", label: "Minijob" }, { key: "praktikum", label: "Praktikum" }, { key: "werkstudent", label: "Werkstudent" }, { key: "freiberuflich", label: "Freiberuflich" }, { key: "vollzeit", label: "Vollzeit" }],
  },
  'mitarbeiter': {
    geschlecht: [{ key: "maennlich", label: "Männlich" }, { key: "weiblich", label: "Weiblich" }, { key: "divers", label: "Divers" }],
    beschaeftigungsstatus: [{ key: "aktiv", label: "Aktiv" }, { key: "inaktiv", label: "Inaktiv" }, { key: "probezeit", label: "In Probezeit" }, { key: "gekuendigt", label: "Gekündigt" }, { key: "elternzeit", label: "Elternzeit" }],
    vertragsart: [{ key: "unbefristet", label: "Unbefristet" }, { key: "befristet", label: "Befristet" }, { key: "minijob", label: "Minijob" }, { key: "praktikum", label: "Praktikum" }, { key: "werkstudent", label: "Werkstudent" }],
  },
  'abwesenheiten': {
    abw_art: [{ key: "urlaub", label: "Urlaub" }, { key: "krankheit", label: "Krankheit" }, { key: "elternzeit", label: "Elternzeit" }, { key: "sonderurlaub", label: "Sonderurlaub" }, { key: "fortbildung", label: "Fortbildung" }, { key: "homeoffice", label: "Homeoffice" }, { key: "sonstiges", label: "Sonstiges" }],
    abw_status: [{ key: "beantragt", label: "Beantragt" }, { key: "genehmigt", label: "Genehmigt" }, { key: "abgelehnt", label: "Abgelehnt" }],
  },
  'leistungsbeurteilungen': {
    lb_fachkompetenz: [{ key: "k1", label: "1 – Ungenügend" }, { key: "k2", label: "2 – Verbesserungsbedarf" }, { key: "k3", label: "3 – Entspricht Erwartungen" }, { key: "k4", label: "4 – Übertrifft Erwartungen" }, { key: "k5", label: "5 – Hervorragend" }],
    lb_teamarbeit: [{ key: "t1", label: "1 – Ungenügend" }, { key: "t2", label: "2 – Verbesserungsbedarf" }, { key: "t3", label: "3 – Entspricht Erwartungen" }, { key: "t4", label: "4 – Übertrifft Erwartungen" }, { key: "t5", label: "5 – Hervorragend" }],
    lb_kommunikation: [{ key: "c2", label: "2 – Verbesserungsbedarf" }, { key: "c3", label: "3 – Entspricht Erwartungen" }, { key: "c4", label: "4 – Übertrifft Erwartungen" }, { key: "c5", label: "5 – Hervorragend" }, { key: "c1", label: "1 – Ungenügend" }],
    lb_eigeninitiative: [{ key: "e1", label: "1 – Ungenügend" }, { key: "e2", label: "2 – Verbesserungsbedarf" }, { key: "e3", label: "3 – Entspricht Erwartungen" }, { key: "e4", label: "4 – Übertrifft Erwartungen" }, { key: "e5", label: "5 – Hervorragend" }],
    lb_gesamtbewertung: [{ key: "gesamt1", label: "Ungenügend" }, { key: "gesamt2", label: "Verbesserungsbedarf" }, { key: "gesamt3", label: "Entspricht Erwartungen" }, { key: "gesamt4", label: "Übertrifft Erwartungen" }, { key: "gesamt5", label: "Hervorragend" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'abteilungen': {
    'abteilung_name': 'string/text',
    'abteilung_kuerzel': 'string/text',
    'abteilung_beschreibung': 'string/textarea',
    'abteilung_leiter_vorname': 'string/text',
    'abteilung_leiter_nachname': 'string/text',
    'abteilung_standort': 'string/text',
    'abteilung_telefon': 'string/tel',
  },
  'stellen': {
    'stelle_titel': 'string/text',
    'stelle_abteilung': 'applookup/select',
    'stelle_beschreibung': 'string/textarea',
    'stelle_beschaeftigungsart': 'lookup/select',
    'stelle_gehalt_min': 'number',
    'stelle_gehalt_max': 'number',
    'stelle_anforderungen': 'string/textarea',
  },
  'mitarbeiter': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'geburtsdatum': 'date/date',
    'geschlecht': 'lookup/radio',
    'email': 'string/email',
    'telefon': 'string/tel',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'mitarbeiter_nr': 'string/text',
    'eintrittsdatum': 'date/date',
    'beschaeftigungsstatus': 'lookup/select',
    'vertragsart': 'lookup/select',
    'ma_abteilung': 'applookup/select',
    'ma_stelle': 'applookup/select',
    'ma_foto': 'file',
    'ma_notizen': 'string/textarea',
  },
  'abwesenheiten': {
    'abw_mitarbeiter': 'applookup/select',
    'abw_art': 'lookup/select',
    'abw_von': 'date/date',
    'abw_bis': 'date/date',
    'abw_grund': 'string/textarea',
    'abw_status': 'lookup/radio',
    'abw_genehmigt_von_vorname': 'string/text',
    'abw_genehmigt_von_nachname': 'string/text',
    'abw_bemerkung': 'string/textarea',
  },
  'leistungsbeurteilungen': {
    'lb_mitarbeiter': 'applookup/select',
    'lb_beurteilungszeitraum': 'string/text',
    'lb_beurteiler_vorname': 'string/text',
    'lb_beurteiler_nachname': 'string/text',
    'lb_datum': 'date/date',
    'lb_fachkompetenz': 'lookup/radio',
    'lb_teamarbeit': 'lookup/radio',
    'lb_kommunikation': 'lookup/radio',
    'lb_eigeninitiative': 'lookup/radio',
    'lb_gesamtbewertung': 'lookup/select',
    'lb_staerken': 'string/textarea',
    'lb_entwicklungsfelder': 'string/textarea',
    'lb_ziele': 'string/textarea',
    'lb_kommentar': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateAbteilungen = StripLookup<Abteilungen['fields']>;
export type CreateStellen = StripLookup<Stellen['fields']>;
export type CreateMitarbeiter = StripLookup<Mitarbeiter['fields']>;
export type CreateAbwesenheiten = StripLookup<Abwesenheiten['fields']>;
export type CreateLeistungsbeurteilungen = StripLookup<Leistungsbeurteilungen['fields']>;