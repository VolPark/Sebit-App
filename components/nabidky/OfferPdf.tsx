/* eslint-disable jsx-a11y/alt-text */
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { Nabidka, NabidkaPolozka } from '@/lib/types/nabidky-types';

// Register Roboto font for Czech characters
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
    ]
});

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
        borderBottomColor: '#FF5E5E', // Light red similar to image
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
        fontSize: 26,
        color: '#FF5E5E',
        fontWeight: 'bold',
        marginBottom: 5
    },
    subTitle: {
        fontSize: 26,
        color: '#FF5E5E',
        fontWeight: 'normal'
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
        backgroundColor: '#FF5E5E',
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
        backgroundColor: '#FF5E5E',
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
        paddingBottom: 15
    },
    itemMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    // Image Layout
    imageContainer: {
        width: 140,
        height: 120,
        backgroundColor: '#f5f5f5',
        marginRight: 15
    },
    itemImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    // Content Layout
    itemContent: {
        flex: 1
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
}

export default function OfferPdf({ offer, items }: OfferPdfProps) {
    const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

    const totalWithoutVat = offer.celkova_cena; // Assuming stored price is without VAT? Usually business logic defines this. Let's assume input is without VAT or handle based on sazba_dph.
    // Actually, items have sazba_dph. 
    // Let's calculate total VAT and Total w/ VAT.
    const totalVat = items.reduce((sum, item) => {
        const itemTotal = Number(item.celkem) || 0;
        const rate = item.sazba_dph || 21;
        return sum + (itemTotal * (rate / 100));
    }, 0);
    const totalWithVat = totalWithoutVat + totalVat;


    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <Image style={styles.logo} src="/logo_full.png" />
                    <View style={styles.headerContacts}>
                        <Text style={{ fontWeight: 'bold', fontSize: 10, marginBottom: 2 }}>Interiéry Horyna s.r.o.</Text>
                        <Text>Nůšařská 4374</Text>
                        <Text>276 01 Mělník</Text>
                        <Text>Česká republika</Text>
                        <Text style={{ marginTop: 5 }}>+420 777 945 161</Text>
                        <Text>www.interiery-horyna.cz</Text>
                    </View>
                </View>
                <View style={styles.separator} />

                {/* Title & Customer */}
                <View style={styles.titleRow}>
                    <View style={styles.titleLeft}>
                        <Text style={styles.mainTitle}>Cenová nabídka -</Text>
                        <Text style={styles.subTitle}>{offer.nazev}</Text>
                    </View>
                    <View style={styles.customerRight}>
                        <Text style={styles.customerLabel}>Zákazník</Text>
                        <Text style={styles.customerName}>{offer.klienti?.nazev}</Text>
                        <Text style={styles.customerAddress}>{offer.akce?.nazev}</Text>
                        {/* If we had full address, we would print it here */}
                        <Text style={[styles.customerAddress, { marginTop: 4 }]}>
                            {/* Placeholder for ICO/DIC if added later */}
                        </Text>
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
                    Předkládáme Vám orientační cenovou nabídku na výrobu a montáž dle předloženého návrhu.
                    Finální cenová nabídka bude vytvořena po společné schůzce a vyjasnění veškerých detailů, materiálů a provedení.
                </Text>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, { width: '50%' }]}>Název položky</Text>
                    <Text style={[styles.th, { width: '10%', textAlign: 'center' }]}>Množství</Text>
                    <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Cena celkem</Text>
                    <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Celkem s DPH</Text>
                </View>

                {/* Items */}
                {items.map((item) => {
                    const itemVatRate = item.sazba_dph || 21;
                    const itemTotal = Number(item.celkem) || 0;
                    const itemTotalVat = itemTotal * (1 + itemVatRate / 100);

                    return (
                        <View key={item.id} style={styles.itemContainer}>
                            {/* Top info line */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{item.nazev}</Text>
                                <View style={{ flexDirection: 'row', width: '50%' }}>
                                    <Text style={{ width: '20%', textAlign: 'center', fontSize: 10 }}>{item.mnozstvi} {item.typ === 'ostatni' ? 'ks' : 'kpl'}</Text>
                                    <Text style={{ width: '40%', textAlign: 'right', fontSize: 10 }}>{currency.format(itemTotal).replace('Kč', '')} Kč</Text>
                                    <Text style={{ width: '40%', textAlign: 'right', fontSize: 10 }}>{currency.format(itemTotalVat).replace('Kč', '')} Kč</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row' }}>
                                {/* Image */}
                                {item.obrazek_url && (
                                    <View style={styles.imageContainer}>
                                        <Image style={styles.itemImage} src={item.obrazek_url} />
                                    </View>
                                )}

                                {/* Description */}
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
                <View style={styles.finalTotals}>
                    <View style={styles.finalRow}>
                        <Text style={styles.finalLabel}>Cena celkem bez DPH:</Text>
                        <Text style={styles.finalValue}>{currency.format(totalWithoutVat)}</Text>
                    </View>
                    <View style={styles.finalRow}>
                        <Text style={styles.finalLabel}>DPH ({items[0]?.sazba_dph || 21}%):</Text>
                        <Text style={styles.finalValue}>{currency.format(totalVat)}</Text>
                    </View>
                    <View style={[styles.finalRow, { borderTopWidth: 1, borderTopColor: '#000', paddingTop: 5, marginTop: 5 }]}>
                        <Text style={[styles.finalLabel, { fontSize: 14 }]}>CELKEM S DPH:</Text>
                        <Text style={[styles.finalValue, { fontSize: 14, color: '#FF5E5E' }]}>{currency.format(totalWithVat)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Interiéry Horyna s.r.o. | IČO: 27649881, DIČ: CZ27649881 | www.interiery-horyna.cz</Text>
                </View>
            </Page>
        </Document>
    );
}
