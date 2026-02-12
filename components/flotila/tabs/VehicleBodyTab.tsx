import RsvDataGrid, { EmptyRsvState, type CzechVehicleData, type RsvSection } from '../RsvDataGrid';

interface VehicleBodyTabProps {
  rsvData: CzechVehicleData | null;
}

export default function VehicleBodyTab({ rsvData }: VehicleBodyTabProps) {
  if (!rsvData) return <EmptyRsvState />;

  const sections: RsvSection[] = [
    {
      title: 'Karoserie',
      fields: [
        { label: 'Druh karoserie', value: rsvData.KaroserieDruh },
        { label: 'Výrobní číslo', value: rsvData.KaroserieVyrobniCislo },
        { label: 'Barva', value: rsvData.VozidloKaroserieBarva },
        { label: 'Doplňková barva', value: rsvData.VozidloKaroserieBarvaDoplnkova },
        { label: 'Počet míst', value: rsvData.VozidloKaroserieMist },
      ],
    },
    {
      title: 'Nápravy a pneumatiky',
      fields: [
        { label: 'Počet a druh náprav', value: rsvData.NapravyPocetDruh },
        { label: 'Pneumatiky a ráfky', value: rsvData.NapravyPneuRafky },
      ],
    },
    {
      title: 'Rozměry',
      fields: [
        { label: 'Rozměry (D×Š×V)', value: rsvData.Rozmery },
        { label: 'Rozvor', value: rsvData.RozmeryRozvor },
        { label: 'Rozchod', value: rsvData.Rozchod },
      ],
    },
    {
      title: 'Hmotnosti',
      fields: [
        { label: 'Provozní hmotnost', value: rsvData.HmotnostiProvozni, unit: 'kg' },
        { label: 'Přípustná hmotnost', value: rsvData.HmotnostiPripPov },
        { label: 'Přípustná hmotnost návěs', value: rsvData.HmotnostiPripPovN },
        { label: 'Brzdný přívěs', value: rsvData.HmotnostiPripPovBrzdenePV },
        { label: 'Nebrzdný přívěs', value: rsvData.HmotnostiPripPovNebrzdenePV },
        { label: 'Jízdní souprava', value: rsvData.HmotnostiPripPovJS },
        { label: 'Test WLTP', value: rsvData.HmotnostiTestWltp },
        { label: 'Užitečné zatížení', value: rsvData.HmotnostUzitecneZatizeniPrumer },
      ],
    },
  ];

  return <RsvDataGrid sections={sections} />;
}
