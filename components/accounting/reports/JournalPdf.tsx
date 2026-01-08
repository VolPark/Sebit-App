import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { AccountingPdfLayout, pdfStyles, pdfConstants } from './AccountingPdfLayout';

interface JournalEntry {
    id: string;
    date: string;
    uol_id: string;
    text: string;
    account_md: string;
    account_d: string;
    amount: number;
}

interface JournalPdfProps {
    data: JournalEntry[];
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
    colDate: { width: '10%', fontSize: 9, fontWeight: 'bold', color: pdfConstants.sectionTextColor },
    colDoc: { width: '15%', fontSize: 9, fontWeight: 'bold', color: pdfConstants.sectionTextColor },
    colText: { width: '35%', fontSize: 9, fontWeight: 'bold', color: pdfConstants.sectionTextColor },
    colMd: { width: '10%', fontSize: 9, fontWeight: 'bold', textAlign: 'right', color: pdfConstants.sectionTextColor },
    colD: { width: '10%', fontSize: 9, fontWeight: 'bold', textAlign: 'right', color: pdfConstants.sectionTextColor },
    colAmount: { width: '20%', fontSize: 9, fontWeight: 'bold', textAlign: 'right', color: pdfConstants.sectionTextColor },

    row: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#f3f4f6',
        paddingVertical: 3,
        paddingHorizontal: 2,
    },
    itemDate: { width: '10%', fontSize: 8 },
    itemDoc: { width: '15%', fontSize: 8 },
    itemText: { width: '35%', fontSize: 8 },
    itemMd: { width: '10%', fontSize: 8, textAlign: 'right', color: '#059669' }, // emerald
    itemD: { width: '10%', fontSize: 8, textAlign: 'right', color: '#d97706' }, // amber
    itemAmount: { width: '20%', fontSize: 8, fontWeight: 'bold', textAlign: 'right' },
});

export function JournalPdf({ data, year }: JournalPdfProps) {
    const currencyFormat = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 }).format(val);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('cs-CZ');
    };

    return (
        <AccountingPdfLayout
            title="Účetní deník (Journal)"
            period={`Rok ${year}`}
            orientation="landscape"
        >
            <View style={styles.tableHeader}>
                <Text style={styles.colDate}>Datum</Text>
                <Text style={styles.colDoc}>Doklad</Text>
                <Text style={styles.colText}>Text</Text>
                <Text style={styles.colMd}>MD</Text>
                <Text style={styles.colD}>D</Text>
                <Text style={styles.colAmount}>Částka</Text>
            </View>

            {data.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 10, fontStyle: 'italic' }}>Žádné záznamy</Text>
            ) : (
                data.map((entry) => (
                    <View key={entry.id} style={styles.row}>
                        <Text style={styles.itemDate}>{formatDate(entry.date)}</Text>
                        <Text style={styles.itemDoc}>{entry.uol_id}</Text>
                        <Text style={styles.itemText}>{entry.text}</Text>
                        <Text style={styles.itemMd}>{entry.account_md}</Text>
                        <Text style={styles.itemD}>{entry.account_d}</Text>
                        <Text style={styles.itemAmount}>{currencyFormat(entry.amount)}</Text>
                    </View>
                ))
            )}
        </AccountingPdfLayout>
    );
}
