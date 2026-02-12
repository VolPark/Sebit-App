import RsvDataGrid, { EmptyRsvState, type CzechVehicleData, type RsvSection } from '../RsvDataGrid';

interface VehicleRegistrationTabProps {
  rsvData: CzechVehicleData | null;
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
        { label: 'Další záznamy', value: rsvData.DalsiZaznamy },
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
        { label: 'RZ vydána', value: rsvData.RzJkVydana },
        { label: 'RZ ke skartaci', value: rsvData.RzKeSkartaci },
        { label: 'RZ odevzdána', value: rsvData.RzOdevzdano },
        { label: 'RZ zadržena', value: rsvData.RzZadrzena },
      ],
    },
  ];

  return <RsvDataGrid sections={sections} />;
}
