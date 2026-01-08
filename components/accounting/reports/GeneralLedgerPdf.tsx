import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { AccountingPdfLayout, pdfStyles, pdfConstants } from './AccountingPdfLayout';

interface LedgerItem {
    account: string;
    name: string;
    initial: number;
    md: number;
    d: number;
    final: number;
}

interface LedgerSynth {
    code: string;
    initial: number;
    md: number;
    d: number;
    final: number;
    accounts: LedgerItem[];
}

interface LedgerGroup {
    code: string;
    initial: number;
    md: number;
    d: number;
    final: number;
    synths: LedgerSynth[];
}

interface LedgerClass {
    code: string;
    initial: number;
    md: number;
    d: number;
    final: number;
    groups: LedgerGroup[];
}

interface GeneralLedgerPdfProps {
    data: LedgerClass[];
    year: number;
}

const styles = StyleSheet.create({
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: pdfConstants.secondaryColor,
        borderBottomWidth: 1,
        borderBottomColor: pdfConstants.themeColor,
        padding: 5,
        alignItems: 'center',
    },
    colAccount: { width: '15%', fontSize: 9, fontWeight: 'bold', color: pdfConstants.sectionTextColor },
    colName: { width: '25%', fontSize: 9, fontWeight: 'bold', color: pdfConstants.sectionTextColor },
    colValue: { width: '15%', fontSize: 9, fontWeight: 'bold', textAlign: 'right', color: pdfConstants.sectionTextColor },

    rowClass: {
        backgroundColor: '#e5e7eb',
        padding: 5,
        marginTop: 10,
        marginBottom: 2,
    },
    rowGroup: {
        backgroundColor: '#f3f4f6',
        padding: 4,
        marginTop: 5,
    },
    rowSynth: {
        padding: 3,
        paddingLeft: 10,
        marginTop: 2,
    },
    rowItem: {
        flexDirection: 'row',
        paddingVertical: 2,
        paddingHorizontal: 5,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f9fafb',
    },
    itemAccount: { width: '15%', fontSize: 8, fontFamily: 'Roboto' },
    itemName: { width: '25%', fontSize: 8, fontFamily: 'Roboto' },
    itemValue: { width: '15%', fontSize: 8, textAlign: 'right', fontFamily: 'Roboto' },

    totalRow: {
        flexDirection: 'row',
        backgroundColor: '#f9fafb',
        padding: 4,
        marginTop: 2,
        borderTopWidth: 0.5,
        borderTopColor: '#e5e7eb',
    },
    totalLabel: { width: '40%', fontSize: 8, fontWeight: 'bold', textAlign: 'right', paddingRight: 10 },

    boldText: { fontWeight: 'bold', fontSize: 9 },
});

export function GeneralLedgerPdf({ data, year }: GeneralLedgerPdfProps) {
    const currencyFormat = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 }).format(val);
    };

    return (
        <AccountingPdfLayout
            title="Hlavní kniha (General Ledger)"
            period={`Rok ${year}`}
            orientation="landscape"
        >
            <View style={styles.tableHeader}>
                <Text style={styles.colAccount}>Účet</Text>
                <Text style={styles.colName}>Název účtu</Text>
                <Text style={styles.colValue}>Počáteční stav</Text>
                <Text style={styles.colValue}>Obrat MD</Text>
                <Text style={styles.colValue}>Obrat D</Text>
                <Text style={styles.colValue}>Konečný zůstatek</Text>
            </View>

            {data.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 10, fontStyle: 'italic' }}>Žádná data</Text>
            ) : (
                data.map((cls) => (
                    <View key={cls.code}>
                        {/* Class Header */}
                        <View style={styles.rowClass}>
                            <Text style={styles.boldText}>Třída {cls.code}</Text>
                        </View>

                        {cls.groups.map((grp) => (
                            <View key={grp.code}>
                                <View style={styles.rowGroup}>
                                    <Text style={[styles.boldText, { fontSize: 8 }]}>Skupina {grp.code}</Text>
                                </View>

                                {grp.synths.map((synth) => (
                                    <View key={synth.code} wrap={false}>
                                        <View style={styles.rowSynth}>
                                            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#4b5563' }}>Syntetický účet {synth.code}</Text>
                                        </View>

                                        {synth.accounts.map((acc) => (
                                            <View key={acc.account} style={styles.rowItem}>
                                                <Text style={styles.itemAccount}>{acc.account}</Text>
                                                <Text style={styles.itemName}>{acc.name}</Text>
                                                <Text style={styles.itemValue}>{currencyFormat(acc.initial)}</Text>
                                                <Text style={styles.itemValue}>{currencyFormat(acc.md)}</Text>
                                                <Text style={styles.itemValue}>{currencyFormat(acc.d)}</Text>
                                                <Text style={[styles.itemValue, { fontWeight: 'bold' }]}>{currencyFormat(acc.final)}</Text>
                                            </View>
                                        ))}

                                        {/* Synth Total */}
                                        <View style={styles.totalRow}>
                                            <Text style={styles.totalLabel}>Celkem ({synth.code})</Text>
                                            <Text style={[styles.itemValue, { fontWeight: 'bold' }]}>{currencyFormat(synth.initial)}</Text>
                                            <Text style={[styles.itemValue, { fontWeight: 'bold' }]}>{currencyFormat(synth.md)}</Text>
                                            <Text style={[styles.itemValue, { fontWeight: 'bold' }]}>{currencyFormat(synth.d)}</Text>
                                            <Text style={[styles.itemValue, { fontWeight: 'bold' }]}>{currencyFormat(synth.final)}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                ))
            )}
        </AccountingPdfLayout>
    );
}
