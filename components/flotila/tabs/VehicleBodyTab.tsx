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
        { label: 'Výrobce karoserie', value: rsvData.VyrobceKaroserie },
        { label: 'Barva', value: rsvData.VozidloKaroserieBarva },
        { label: 'Doplňková barva', value: rsvData.VozidloKaroserieBarvaDoplnkova },
        { label: 'Počet míst', value: rsvData.VozidloKaroserieMist },
        { label: 'Poznámka k sedadlům', value: rsvData.VozidloKaroserieMistSezeniPozn },
        { label: 'Poznámka ke stání', value: rsvData.VozidloKaroserieMistStaniPozn },
      ],
    },
    {
      title: 'Nápravy a pneumatiky',
      fields: [
        { label: 'Počet a druh náprav', value: rsvData.NapravyPocetDruh },
        { label: 'Pneumatiky a ráfky', value: rsvData.NapravyPneuRafky, multiline: true },
      ],
    },
    {
      title: 'Rozměry',
      fields: [
        { label: 'Rozměry (D×Š×V)', value: rsvData.Rozmery },
        { label: 'Max. délka', value: rsvData.RozmeryDelkaDo },
        { label: 'Max. výška', value: rsvData.RozmeryVyskaDo },
        { label: 'Ložná délka', value: rsvData.RozmeryLoznaDelka },
        { label: 'Ložná šířka', value: rsvData.RozmeryLoznaSirka },
        { label: 'Rozvor', value: rsvData.RozmeryRozvor },
        { label: 'Rozchod', value: rsvData.Rozchod },
      ],
    },
    {
      title: 'Hmotnosti',
      fields: [
        { label: 'Provozní hmotnost', value: rsvData.HmotnostiProvozni, unit: 'kg' },
        { label: 'Provozní hmotnost do', value: rsvData.HmotnostiProvozniDo },
        { label: 'Přípustná hmotnost', value: rsvData.HmotnostiPripPov },
        { label: 'Přípustná hmotnost návěs', value: rsvData.HmotnostiPripPovN, multiline: true },
        { label: 'Brzdný přívěs', value: rsvData.HmotnostiPripPovBrzdenePV },
        { label: 'Nebrzdný přívěs', value: rsvData.HmotnostiPripPovNebrzdenePV },
        { label: 'Jízdní souprava', value: rsvData.HmotnostiPripPovJS },
        { label: 'Test WLTP', value: rsvData.HmotnostiTestWltp },
        { label: 'Užitečné zatížení', value: rsvData.HmotnostUzitecneZatizeniPrumer },
        { label: 'Zatížení spoj. zařízení', value: rsvData.HmotnostiZatizeniSZ },
        { label: 'Typ zatížení SZ', value: rsvData.HmotnostiZatizeniSZTyp },
      ],
    },
  ];

  return <RsvDataGrid sections={sections} />;
}
