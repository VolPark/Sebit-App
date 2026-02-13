import RsvDataGrid, { EmptyRsvState, parseDalsiZaznamy, type CzechVehicleData, type RsvSection } from '../RsvDataGrid';

interface VehicleRegistrationTabProps {
  rsvData: CzechVehicleData | null;
}

function DalsiZaznamySection({ raw }: { raw: string | null }) {
  if (!raw) return null;

  const records = parseDalsiZaznamy(raw);
  if (records.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-200 dark:border-slate-700 pb-1">
        Další záznamy
      </h4>
      <ul className="space-y-2">
        {records.map((record, i) => (
          <li key={i} className="text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700">
            {record}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function VehicleRegistrationTab({ rsvData }: VehicleRegistrationTabProps) {
  if (!rsvData) return <EmptyRsvState />;

  const sections: RsvSection[] = [
    {
      title: 'Registrace a status',
      fields: [
        { label: 'Status', value: rsvData.StatusNazev },
        { label: 'Zařazení vozidla', value: rsvData.ZarazeniVozidla },
        { label: 'Kategorie', value: rsvData.Kategorie },
        { label: 'Druh vozidla', value: rsvData.VozidloDruh },
        { label: 'Druh vozidla 2', value: rsvData.VozidloDruh2 },
        { label: 'Počet vlastníků', value: rsvData.PocetVlastniku },
        { label: 'Počet provozovatelů', value: rsvData.PocetProvozovatelu },
        { label: 'Datum 1. registrace', value: rsvData.DatumPrvniRegistrace },
        { label: 'Datum 1. reg. v ČR', value: rsvData.DatumPrvniRegistraceVCr },
        { label: 'Účel vozidla', value: rsvData.VozidloUcel },
        { label: 'Stupeň dokončení', value: rsvData.StupenDokonceni },
        { label: 'Spojovací zařízení', value: rsvData.VozidloSpojZarizNazev },
        { label: 'Alternativní provedení', value: rsvData.AlternativniProvedeni },
        { label: 'Autonomní řízení', value: rsvData.VozidloAutonomniStupen },
      ],
    },
    {
      title: 'Identifikace a schválení',
      fields: [
        { label: 'Typ', value: rsvData.Typ },
        { label: 'Varianta', value: rsvData.Varianta },
        { label: 'Verze', value: rsvData.Verze },
        { label: 'Výrobce vozidla', value: rsvData.VozidloVyrobce },
        { label: 'Výrobce karoserie', value: rsvData.VyrobceKaroserie },
        { label: 'Typové schválení', value: rsvData.CisloTypovehoSchvaleni },
        { label: 'Homologace ES', value: rsvData.HomologaceEs },
      ],
    },
    {
      title: 'Technické prohlídky',
      fields: [
        { label: 'STK do', value: rsvData.PravidelnaTechnickaProhlidkaDo },
        { label: 'Před registrací', value: rsvData.PredRegistraciProhlidkaDne },
        { label: 'Před schválením', value: rsvData.PredSchvalenimProhlidkaDne },
        { label: 'Evidenční prohlídka', value: rsvData.EvidencniProhlidkaDne },
        { label: 'Historické vozidlo', value: rsvData.HistorickeVozidloProhlidkaDne },
      ],
    },
    {
      title: 'Doklady',
      fields: [
        { label: 'Číslo TP', value: rsvData.CisloTp },
        { label: 'Číslo ORV', value: rsvData.CisloOrv },
        { label: 'ORV zadrženo', value: rsvData.OrvZadrzeno },
        { label: 'ORV ke skartaci', value: rsvData.OrvKeSkartaci },
        { label: 'ORV odevzdáno', value: rsvData.OrvOdevzdano },
        { label: 'Druh RZ', value: rsvData.RzDruh },
        { label: 'Varianta RZ', value: rsvData.RzVarianta },
        { label: 'RZ vydána', value: rsvData.RzJkVydana },
        { label: 'RZ ke skartaci', value: rsvData.RzKeSkartaci },
        { label: 'RZ odevzdána', value: rsvData.RzOdevzdano },
        { label: 'RZ zadržena', value: rsvData.RzZadrzena },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <RsvDataGrid sections={sections} />
      <DalsiZaznamySection raw={rsvData.DalsiZaznamy as string | null} />
    </div>
  );
}
