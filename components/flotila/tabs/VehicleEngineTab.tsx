import RsvDataGrid, { EmptyRsvState, type CzechVehicleData, type RsvSection } from '../RsvDataGrid';

interface VehicleEngineTabProps {
  rsvData: CzechVehicleData | null;
}

export default function VehicleEngineTab({ rsvData }: VehicleEngineTabProps) {
  if (!rsvData) return <EmptyRsvState />;

  const sections: RsvSection[] = [
    {
      title: 'Motor a převodovka',
      fields: [
        { label: 'Palivo', value: rsvData.Palivo },
        { label: 'Zdvihový objem', value: rsvData.MotorZdvihObjem, unit: 'cm³' },
        { label: 'Max. výkon', value: rsvData.MotorMaxVykon },
        { label: 'Typ motoru', value: rsvData.MotorTyp },
        { label: 'Výrobce motoru', value: rsvData.MotorVyrobce },
        { label: 'Elektrické vozidlo', value: rsvData.VozidloElektricke },
        { label: 'Hybridní vozidlo', value: rsvData.VozidloHybridni },
        { label: 'Třída hybridu', value: rsvData.VozidloHybridniTrida },
        { label: 'Nejvyšší rychlost', value: rsvData.NejvyssiRychlost, unit: 'km/h' },
        { label: 'Poměr výkon/hmotnost', value: rsvData.PomerVykonHmotnost, unit: 'kW/kg' },
      ],
    },
    {
      title: 'Spotřeba a hluk',
      fields: [
        { label: 'Metodika měření', value: rsvData.SpotrebaMetodika },
        { label: 'Spotřeba na 100 km', value: rsvData.SpotrebaNa100Km },
        { label: 'Spotřeba', value: rsvData.Spotreba },
        { label: 'Spotřeba el. energie', value: rsvData.SpotrebaEl },
        { label: 'Dojezd', value: rsvData.DojezdZR },
        { label: 'Hluk stojící/otáčky', value: rsvData.HlukStojiciOtacky },
        { label: 'Hluk za jízdy', value: rsvData.HlukJizda, unit: 'dB' },
      ],
    },
  ];

  return <RsvDataGrid sections={sections} />;
}
