/* eslint-disable jsx-a11y/alt-text */
'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { Nabidka, NabidkaPolozka } from '@/lib/types/nabidky-types';

// Register fonts (optional, using default Helvetica for now to ensure compatibility)
// For Czech characters, we usually need a font like Roboto or Open Sans. 
// We will try standard fonts first, if encoding issues occur, we will register a font.
Font.register({
    family: 'Roboto',
    src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf'
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Roboto',
        fontSize: 10,
        color: '#333'
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#E30613',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    logo: {
        width: 150,
        marginBottom: 5
    },
    headerInfo: {
        textAlign: 'right'
    },
    title: {
        fontSize: 18,
        marginBottom: 5,
        marginTop: 20,
        fontWeight: 'bold'
    },
    section: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f9fafb',
        borderRadius: 5
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5
    },
    label: {
        color: '#666',
        width: 80
    },
    value: {
        fontWeight: 'bold',
        flex: 1
    },
    table: {
        marginTop: 20,
        marginBottom: 20
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 5,
        marginBottom: 5,
        fontWeight: 'bold',
        color: '#E30613'
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 8
    },
    colName: { width: '40%' },
    colType: { width: '20%' },
    colQty: { width: '10%', textAlign: 'right' },
    colPrice: { width: '15%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },

    totalSection: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 2,
        borderTopColor: '#E30613',
        alignItems: 'flex-end'
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 5
    },
    totalLabel: {
        fontSize: 12,
        marginRight: 20,
        fontWeight: 'bold'
    },
    totalValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#E30613'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        color: '#999',
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10
    }
});

interface OfferPdfProps {
    offer: Nabidka;
    items: NabidkaPolozka[];
}

export default function OfferPdf({ offer, items }: OfferPdfProps) {
    const currency = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 });

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Image style={styles.logo} src="/logo_full.png" />
                        <Text>Kompletní interiérové úpravy a truhlářské výrobky</Text>
                    </View>
                    <View style={styles.headerInfo}>
                        <Text>Nabídka č.: {offer.cislo || offer.id}</Text>
                        <Text>Datum: {new Date(offer.created_at).toLocaleDateString('cs-CZ')}</Text>
                    </View>
                </View>

                <Text style={styles.title}>{offer.nazev}</Text>

                {/* Info Section */}
                <View style={{ flexDirection: 'row', gap: 20 }}>
                    <View style={[styles.section, { flex: 1 }]}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Dodavatel:</Text>
                        <Text>Interiéry Horyna</Text>
                        <Text>Nůšařská 4374</Text>
                        <Text>276 01 Mělník</Text>
                        <Text>IČ: 27649881</Text>
                    </View>
                    <View style={[styles.section, { flex: 1 }]}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Odběratel:</Text>
                        <Text>{offer.klienti?.nazev || 'Nezadáno'}</Text>
                        {/* Add more client fields if available in future */}
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colName}>Položka</Text>
                        <Text style={styles.colType}>Typ</Text>
                        <Text style={styles.colQty}>Mn.</Text>
                        <Text style={styles.colPrice}>Cena/ks</Text>
                        <Text style={styles.colTotal}>Celkem</Text>
                    </View>

                    {items.map((item) => (
                        <View key={item.id} style={styles.tableRow}>
                            <Text style={styles.colName}>{item.nazev}</Text>
                            <Text style={styles.colType}>{item.typ}</Text>
                            <Text style={styles.colQty}>{item.mnozstvi}</Text>
                            <Text style={styles.colPrice}>{currency.format(item.cena_ks).replace('Kč', '')}</Text>
                            <Text style={styles.colTotal}>{currency.format(item.celkem).replace('Kč', '')}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalSection}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>CELKEM K ÚHRADĚ:</Text>
                        <Text style={styles.totalValue}>{currency.format(offer.celkova_cena)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>Děkujeme za váš zájem. Tato nabídka je platná 30 dní.</Text>
                    <Text>V případě dotazů nás neváhejte kontaktovat.</Text>
                </View>
            </Page>
        </Document>
    );
}
