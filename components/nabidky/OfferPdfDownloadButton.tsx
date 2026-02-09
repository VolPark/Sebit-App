'use client';

import { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import OfferPdf from '@/components/nabidky/OfferPdf';
import { Nabidka, NabidkaPolozka } from '@/lib/types/nabidky-types';
import { CompanyConfig } from '@/lib/companyConfig';

interface OfferPdfDownloadButtonProps {
    offer: Nabidka;
    items: NabidkaPolozka[];
}

const sanitizeFilename = (name: string) => {
    return name.replace(/[<>:"/\\|?*]/g, '').trim();
};

async function prefetchImages(items: NabidkaPolozka[]): Promise<Record<string, string>> {
    const imageMap: Record<string, string> = {};
    const itemsWithImages = items.filter(item => item.obrazek_url);

    if (itemsWithImages.length === 0) return imageMap;

    await Promise.all(
        itemsWithImages.map(async (item) => {
            try {
                // Fetch through proxy to bypass CORS for external images
                // The proxy is same-origin so cookies are sent automatically
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(item.obrazek_url!)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) {
                    console.warn(`Proxy fetch failed (${response.status}) for:`, item.obrazek_url);
                    return;
                }
                const blob = await response.blob();
                const dataUri = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                imageMap[item.obrazek_url!] = dataUri;
            } catch (e) {
                console.warn('Failed to prefetch image:', item.obrazek_url, e);
            }
        })
    );

    return imageMap;
}

export default function OfferPdfDownloadButton({ offer, items }: OfferPdfDownloadButtonProps) {
    const [imageMap, setImageMap] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        const hasImages = items.some(item => item.obrazek_url);
        if (!hasImages) {
            setImageMap({});
            return;
        }

        setImageMap(null);
        prefetchImages(items).then(setImageMap);
    }, [items]);

    const fileName = `${CompanyConfig.shortName} - ${sanitizeFilename(offer.nazev)} (${sanitizeFilename(offer.cislo || offer.id.toString())}).pdf`;

    if (imageMap === null) {
        return (
            <span className="inline-flex items-center gap-2 bg-brand-primary/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                Připravuji PDF...
            </span>
        );
    }

    return (
        <PDFDownloadLink
            document={<OfferPdf offer={offer} items={items} imageMap={imageMap} />}
            fileName={fileName}
            className="inline-flex items-center gap-2 bg-brand-primary hover:brightness-110 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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
