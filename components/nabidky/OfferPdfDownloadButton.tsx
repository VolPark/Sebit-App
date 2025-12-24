'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import OfferPdf from '@/components/nabidky/OfferPdf';
import { Nabidka, NabidkaPolozka } from '@/lib/types/nabidky-types';

interface OfferPdfDownloadButtonProps {
    offer: Nabidka;
    items: NabidkaPolozka[];
}


const sanitizeFilename = (name: string) => {
    return name.replace(/[<>:"/\\|?*]/g, '').trim();
};

export default function OfferPdfDownloadButton({ offer, items }: OfferPdfDownloadButtonProps) {
    return (
        <PDFDownloadLink
            document={<OfferPdf offer={offer} items={items} />}
            fileName={`Horyna - ${sanitizeFilename(offer.nazev)} (${sanitizeFilename(offer.cislo || offer.id.toString())}).pdf`}
            className="inline-flex items-center gap-2 bg-[#E30613] hover:bg-[#C00000] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
            {({ loading }) =>
                loading ? 'Generuji...' : (
                    <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Export do PDF
                    </>
                )
            }
        </PDFDownloadLink>
    );
}
