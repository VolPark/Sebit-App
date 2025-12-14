'use client';

import { useRouter } from 'next/navigation';

const companies = [
  { id: 1, name: 'Interiéry Horyna' },
  { id: 2, name: 'Interiéry Horyna - Stínění' },
  { id: 3, name: 'Interiéry Horyna - Truhlárna' },
];

export default function CompanySelectionPage() {
  const router = useRouter();

  const handleCompanySelect = (company: { id: number; name: string }) => {
    localStorage.setItem('selectedCompany', JSON.stringify(company));
    router.push('/vykazy');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-slate-800">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Vyberte firmu
        </h2>
        <div className="space-y-4">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleCompanySelect(company)}
              className="w-full px-4 py-3 text-lg font-medium text-white bg-[#E30613] rounded-md hover:bg-[#C00000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#E30613] transition-colors"
            >
              {company.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
