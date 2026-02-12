import RsvDataGrid, { EmptyRsvState, type CzechVehicleData, type RsvSection } from '../RsvDataGrid';

interface VehicleEmissionsTabProps {
  rsvData: CzechVehicleData | null;
}

export default function VehicleEmissionsTab({ rsvData }: VehicleEmissionsTabProps) {
  if (!rsvData) return <EmptyRsvState />;

  const sections: RsvSection[] = [
    {
      title: 'Emisní norma',
      fields: [
        { label: 'Emisní úroveň', value: rsvData.EmisniUroven },
        { label: 'Předpis EHK/OSN/EHS/ES', value: rsvData.EmiseEHKOSNEHSES },
        { label: 'Emise KSA', value: rsvData.EmiseKSA },
      ],
    },
    {
      title: 'CO2 a technologie',
      fields: [
        { label: 'CO2', value: rsvData.EmiseCO2 },
        { label: 'CO2 specifické', value: rsvData.EmiseCO2Specificke },
        { label: 'Snížení NEDC', value: rsvData.EmiseSnizeniNedc },
        { label: 'Snížení WLTP', value: rsvData.EmiseSnizeniWltp },
        { label: 'Inovativní technologie', value: rsvData.InovativniTechnologie },
        { label: 'Faktor odchylky De', value: rsvData.FaktorOdchylkyDe },
        { label: 'Faktor verifikace Vf', value: rsvData.FaktorVerifikaceVf },
      ],
    },
  ];

  return <RsvDataGrid sections={sections} />;
}
