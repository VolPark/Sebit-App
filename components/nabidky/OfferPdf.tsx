/* eslint-disable jsx-a11y/alt-text */
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { Nabidka, NabidkaPolozka } from '@/lib/types/nabidky-types';
import { CompanyConfig } from '@/lib/companyConfig';
import { KlientField } from '@/lib/types/klient-types';

// Register Roboto font for Czech characters
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
    ]
});

const THEME_COLOR = process.env.NEXT_PUBLIC_PDF_THEME_COLOR || '#E30613'; // Default Horyna Red
const DEFAULT_INTRO_TEXT = 'Předkládáme Vám orientační cenovou nabídku na výrobu a montáž dle předloženého návrhu. Finální cenová nabídka bude vytvořena po společné schůzce a vyjasnění veškerých detailů, materiálů a provedení.';

const styles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingBottom: 60,
        paddingHorizontal: 40,
        fontFamily: 'Roboto',
        fontSize: 10,
        color: '#333',
        lineHeight: 1.4
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10
    },
    logo: {
        width: 140,
        height: 'auto'
    },
    headerContacts: {
        textAlign: 'right',
        fontSize: 8,
        color: '#555',
        lineHeight: 1.4
    },
    separator: {
        borderBottomWidth: 3,
        borderBottomColor: THEME_COLOR,
        marginBottom: 20
    },
    // Title & Customer
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30
    },
    titleLeft: {
        width: '50%'
    },
    mainTitle: {
        fontSize: 24,
        color: THEME_COLOR,
        fontWeight: 'bold',
        marginBottom: 10
    },
    subTitle: {
        fontSize: 18,
        color: THEME_COLOR,
        fontWeight: 'normal',
        marginTop: 5
    },
    customerRight: {
        width: '40%'
    },
    customerLabel: {
        fontSize: 10,
        color: '#888',
        marginBottom: 4
    },
    customerName: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2
    },
    customerAddress: {
        fontSize: 10,
        color: '#444'
    },
    // Boxes (Date, Validity, Number)
    boxesRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 15,
        marginBottom: 30
    },
    boxRed: {
        backgroundColor: THEME_COLOR,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 15,
        alignItems: 'center',
        minWidth: 90
    },
    boxGray: {
        backgroundColor: '#777',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 15,
        alignItems: 'center',
        minWidth: 90
    },
    boxLabel: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 2
    },
    boxValue: {
        color: 'white',
        fontSize: 11,
        fontWeight: 'bold'
    },
    // Intro Text
    introText: {
        fontSize: 10,
        color: '#666',
        marginBottom: 20
    },
    // Table
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: THEME_COLOR,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    th: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold'
    },
    // Columns
    colName: { width: '40%' }, // Dynamic width handling in logic below
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },
    colVat: { width: '20%', textAlign: 'right' },

    // Item Row
    itemContainer: {
        marginTop: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 20
    },
    itemMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    // Image Layout
    imageContainer: {
        width: 140,
        height: 120,
        marginRight: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    itemImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain'
    },
    // Content Layout
    itemContent: {
        // Natural height
    },
    itemName: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8
    },
    itemDesc: {
        fontSize: 9,
        color: '#555',
        marginBottom: 10,
        lineHeight: 1.5
    },
    // Prices in Item
    pricesRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 5
    },
    priceLabel: { fontSize: 8, color: '#888', marginRight: 5 },
    priceVal: { fontSize: 10, fontWeight: 'bold' },

    // Totals Section across page
    totalsSection: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        marginTop: 5,
        paddingTop: 8,
    },

    // Final Totals
    finalTotals: {
        marginTop: 30,
        alignItems: 'flex-end'
    },
    finalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '50%',
        marginBottom: 5
    },
    finalLabel: { fontSize: 11, fontWeight: 'bold' },
    finalValue: { fontSize: 11, width: 100, textAlign: 'right' },

    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee'
    },
    footerText: {
        fontSize: 8,
        color: '#999',
        textAlign: 'center'
    }
});

interface OfferPdfProps {
    offer: Nabidka;
    items: NabidkaPolozka[];
    imageMap?: Record<string, string>;
    visibleClientFields?: KlientField[];
}

export default function OfferPdf({ offer, items, imageMap, visibleClientFields = ['nazev'] }: OfferPdfProps) {
    const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

    // Safe array reference for field checks (guard against undefined/null)
    const fields: KlientField[] = Array.isArray(visibleClientFields) ? visibleClientFields : ['nazev'];

    // Pre-compute IČO/DIČ line to avoid rendering empty <Text> elements
    const icoDicParts = [
        fields.includes('ico') && offer.klienti?.ico ? `IČO: ${offer.klienti.ico}` : null,
        fields.includes('dic') && offer.klienti?.dic ? `DIČ: ${offer.klienti.dic}` : null,
    ].filter(Boolean);
    const icoDicLine = icoDicParts.length > 0 ? icoDicParts.join(', ') : null;

    // Separate regular items from discount items
    const regularItems = items.filter(i => !i.je_sleva && i.cena_ks >= 0);
    const discountItems = items.filter(i => i.je_sleva || i.cena_ks < 0);

    // Sum of regular items only (positive)
    const regularTotal = regularItems.reduce((sum, item) => sum + (Number(item.celkem) || 0), 0);
    // Sum of discount items (negative values)
    const itemDiscountTotal = discountItems.reduce((sum, item) => sum + (Number(item.celkem) || 0), 0);

    // Subtotal = sum of all items (including negative discount items)
    const subtotal = regularTotal + itemDiscountTotal;

    // Global discount
    const slevaProcenta = Number(offer.sleva_procenta) || 0;
    const globalDiscountAmount = subtotal * (slevaProcenta / 100);
    const totalWithoutVat = Math.max(0, subtotal - globalDiscountAmount);

    const hasItemDiscounts = discountItems.length > 0;

    // VAT calculated per-item (discount items have sazba_dph=0 so they don't add VAT)
    const totalVat = items.reduce((sum, item) => {
        const itemTotal = Number(item.celkem) || 0;
        const rate = item.sazba_dph || 21;
        return sum + (itemTotal * (rate / 100));
    }, 0);
    // If global discount, reduce VAT proportionally
    const adjustedVat = slevaProcenta > 0 ? totalVat * (1 - slevaProcenta / 100) : totalVat;
    const totalWithVat = totalWithoutVat + Math.max(0, adjustedVat);


    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <Image style={styles.logo} src={CompanyConfig.branding.logoLightUrl} />
                    <View style={styles.headerContacts}>
                        <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 2 }}>{CompanyConfig.billing.companyName}</Text>
                        <Text>{CompanyConfig.address.line1}</Text>
                        <Text>{CompanyConfig.address.city}</Text>
                        <Text>{CompanyConfig.address.country}</Text>
                        <Text style={{ marginTop: 5 }}>{CompanyConfig.contact.phone}</Text>
                        <Text>{CompanyConfig.contact.web}</Text>
                    </View>
                </View>
                <View style={styles.separator} />

                {/* Title & Customer */}
                <View style={styles.titleRow}>
                    <View style={styles.titleLeft}>
                        <Text style={styles.mainTitle}>Cenová nabídka</Text>
                        <View style={{ height: 20 }} />
                        <Text style={styles.subTitle}>{offer.nazev}</Text>
                    </View>
                    <View style={styles.customerRight}>
                        <Text style={styles.customerLabel}>Zákazník</Text>
                        {fields.includes('nazev') && offer.klienti?.nazev ? (
                            <Text style={styles.customerName}>{offer.klienti.nazev}</Text>
                        ) : null}
                        {fields.includes('kontaktni_osoba') && offer.klienti?.kontaktni_osoba ? (
                            <Text style={styles.customerAddress}>{offer.klienti.kontaktni_osoba}</Text>
                        ) : null}
                        {fields.includes('address') && offer.klienti?.address ? (
                            <Text style={styles.customerAddress}>{offer.klienti.address}</Text>
                        ) : null}
                        {icoDicLine ? (
                            <Text style={[styles.customerAddress, { marginTop: 4 }]}>
                                {icoDicLine}
                            </Text>
                        ) : null}
                        {fields.includes('telefon') && offer.klienti?.telefon ? (
                            <Text style={styles.customerAddress}>Tel: {offer.klienti.telefon}</Text>
                        ) : null}
                        {fields.includes('email') && offer.klienti?.email ? (
                            <Text style={styles.customerAddress}>{offer.klienti.email}</Text>
                        ) : null}
                        {fields.includes('web') && offer.klienti?.web ? (
                            <Text style={styles.customerAddress}>{offer.klienti.web}</Text>
                        ) : null}
                    </View>
                </View>

                {/* Boxes */}
                <View style={styles.boxesRow}>
                    <View style={styles.boxRed}>
                        <Text style={styles.boxLabel}>Datum</Text>
                        <Text style={styles.boxValue}>{new Date(offer.created_at).toLocaleDateString('cs-CZ')}</Text>
                    </View>
                    <View style={styles.boxGray}>
                        <Text style={styles.boxLabel}>Platnost do</Text>
                        <Text style={styles.boxValue}>
                            {offer.platnost_do ? new Date(offer.platnost_do).toLocaleDateString('cs-CZ') : 'Neurčeno'}
                        </Text>
                    </View>
                    <View style={styles.boxRed}>
                        <Text style={styles.boxLabel}>Nabídka č.</Text>
                        <Text style={styles.boxValue}>{offer.cislo || offer.id}</Text>
                    </View>
                </View>

                {/* Intro */}
                <Text style={styles.introText}>
                    {offer.uvodni_text || DEFAULT_INTRO_TEXT}
                </Text>

                {/* Table Header */}
                <View style={styles.tableHeader} fixed>
                    <Text style={[styles.th, { width: '50%' }]}>Název položky</Text>
                    <Text style={[styles.th, { width: '10%', textAlign: 'center' }]}>Množství</Text>
                    <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Cena celkem</Text>
                    <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Celkem s DPH</Text>
                </View>

                {/* Items */}
                {items.map((item, index) => {
                    const itemVatRate = item.sazba_dph || 21;
                    const itemTotal = Number(item.celkem) || 0;
                    const itemTotalVat = itemTotal * (1 + itemVatRate / 100);
                    const isLast = index === items.length - 1;

                    return (
                        <View key={item.id} style={styles.itemContainer} minPresenceAhead={isLast ? 80 : 0}>
                            {/* Top info line */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.je_sleva ? '#dc2626' : '#333' }}>{item.je_sleva ? `↓ ${item.nazev}` : item.nazev}</Text>
                                <View style={{ flexDirection: 'row', width: '50%' }}>
                                    <Text style={{ width: '20%', textAlign: 'center', fontSize: 10 }}>{item.mnozstvi} {item.typ === 'ostatni' ? 'ks' : 'kpl'}</Text>
                                    <Text style={{ width: '40%', textAlign: 'right', fontSize: 10 }}>{currency.format(itemTotal).replace('Kč', '')} Kč</Text>
                                    <Text style={{ width: '40%', textAlign: 'right', fontSize: 10 }}>{currency.format(itemTotalVat).replace('Kč', '')} Kč</Text>
                                </View>
                            </View>

                            <View style={{ position: 'relative', minHeight: imageMap?.[item.obrazek_url!] ? 120 : 0, paddingLeft: imageMap?.[item.obrazek_url!] ? 155 : 0 }}>
                                {/* Image - Positioned Absolutely */}
                                {item.obrazek_url && imageMap?.[item.obrazek_url!] && (
                                    <View style={[styles.imageContainer, { position: 'absolute', top: 0, left: 0 }]} wrap={false}>
                                        <Image
                                            style={styles.itemImage}
                                            src={imageMap[item.obrazek_url!]}
                                        />
                                    </View>
                                )}

                                {/* Description - Now using the padding of the parent */}
                                <View style={styles.itemContent}>
                                    <Text style={styles.itemDesc}>
                                        {item.popis || 'Bez popisu.'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    );
                })}

                {/* Final Totals */}
                <View style={styles.finalTotals} wrap={false}>
                    {(hasItemDiscounts || slevaProcenta > 0) && (
                        <>
                            <View style={styles.finalRow}>
                                <Text style={styles.finalLabel}>Cena za položky:</Text>
                                <Text style={styles.finalValue}>{currency.format(regularTotal)}</Text>
                            </View>
                            {hasItemDiscounts && discountItems.map(di => (
                                <View key={di.id} style={styles.finalRow}>
                                    <Text style={[styles.finalLabel, { color: '#dc2626' }]}>{di.nazev}:</Text>
                                    <Text style={[styles.finalValue, { color: '#dc2626' }]}>{currency.format(Number(di.celkem) || 0)}</Text>
                                </View>
                            ))}
                            {slevaProcenta > 0 && (
                                <View style={styles.finalRow}>
                                    <Text style={[styles.finalLabel, { color: '#dc2626' }]}>Sleva {slevaProcenta}%:</Text>
                                    <Text style={[styles.finalValue, { color: '#dc2626' }]}>-{currency.format(globalDiscountAmount)}</Text>
                                </View>
                            )}
                        </>
                    )}
                    <View style={styles.finalRow}>
                        <Text style={styles.finalLabel}>Cena celkem bez DPH:</Text>
                        <Text style={styles.finalValue}>{currency.format(totalWithoutVat)}</Text>
                    </View>
                    <View style={styles.finalRow}>
                        <Text style={styles.finalLabel}>DPH:</Text>
                        <Text style={styles.finalValue}>{currency.format(Math.max(0, adjustedVat))}</Text>
                    </View>
                    <View style={[styles.finalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5, marginTop: 5 }]}>
                        <Text style={[styles.finalLabel, { fontSize: 14 }]}>CELKEM S DPH:</Text>
                        <Text style={[styles.finalValue, { fontSize: 14, color: THEME_COLOR }]}>{currency.format(totalWithVat)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>{CompanyConfig.billing.companyName} | IČO: {CompanyConfig.billing.ico}, DIČ: {CompanyConfig.billing.dic} | {CompanyConfig.contact.web}</Text>
                </View>
            </Page>
        </Document>
    );
}
