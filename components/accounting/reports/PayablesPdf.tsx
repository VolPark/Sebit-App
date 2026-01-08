import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { AccountingPdfLayout, pdfStyles, pdfConstants } from './AccountingPdfLayout';
import { AccountingDocument } from '@/types/accounting';

interface GroupedPayables {
    supplier_name: string;
    documents: AccountingDocument[];
    total_amount: number;
    total_paid: number;
    total_remaining: number;
}

interface PayablesPdfProps {
    data: GroupedPayables[];
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
    colDoc: { width: '20%', fontSize: 9, fontWeight: 'bold', color: pdfConstants.sectionTextColor },
    colIssue: { width: '15%', fontSize: 9, fontWeight: 'bold', color: pdfConstants.sectionTextColor },
    colDue: { width: '15%', fontSize: 9, fontWeight: 'bold', color: pdfConstants.sectionTextColor },
    colAmount: { width: '15%', fontSize: 9, fontWeight: 'bold', textAlign: 'right', color: pdfConstants.sectionTextColor },
    colPaid: { width: '15%', fontSize: 9, fontWeight: 'bold', textAlign: 'right', color: pdfConstants.sectionTextColor },
    colRemaining: { width: '20%', fontSize: 9, fontWeight: 'bold', textAlign: 'right', color: pdfConstants.sectionTextColor },

    rowGroup: {
        backgroundColor: '#e5e7eb',
        padding: 5,
        marginTop: 10,
        marginBottom: 2,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    groupTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    groupTotal: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1f2937',
    }, // Payables often red-ish in UI, but keep standard for PDF readability

    rowItem: {
        flexDirection: 'row',
        paddingVertical: 3,
        paddingHorizontal: 5,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f3f4f6',
    },
    itemDoc: { width: '20%', fontSize: 8 },
    itemIssue: { width: '15%', fontSize: 8 },
    itemDue: { width: '15%', fontSize: 8 },
    itemAmount: { width: '15%', fontSize: 8, textAlign: 'right' },
    itemPaid: { width: '15%', fontSize: 8, textAlign: 'right' },
    itemRemaining: { width: '20%', fontSize: 8, textAlign: 'right', fontWeight: 'bold', color: '#be123c' }, // Rose/Red for liability

    grandTotalRow: {
        flexDirection: 'row',
        backgroundColor: '#fef2f2', // Red-50
        padding: 8,
        marginTop: 20,
        borderTopWidth: 2,
        borderTopColor: '#fecaca',
    },
    grandTotalLabel: { flex: 1, fontSize: 12, fontWeight: 'bold', textAlign: 'right', paddingRight: 20, color: '#991b1b' },
    grandTotalValue: { fontSize: 12, fontWeight: 'bold', color: '#991b1b' },
});

export function PayablesPdf({ data }: PayablesPdfProps) {
    const currencyFormat = (val: number, currency = 'CZK') => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(val);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('cs-CZ');
    };

    const totalPayables = data.reduce((sum, group) => sum + group.total_remaining, 0);

    return (
        <AccountingPdfLayout
            title="Závazky (Payables)"
            period={`Ke dni ${new Date().toLocaleDateString('cs-CZ')}`}
            orientation="portrait"
        >
            <View style={styles.tableHeader}>
                <Text style={styles.colDoc}>Doklad</Text>
                <Text style={styles.colIssue}>Vystaveno</Text>
                <Text style={styles.colDue}>Splatnost</Text>
                <Text style={styles.colAmount}>Částka</Text>
                <Text style={styles.colPaid}>Uhrazeno</Text>
                <Text style={styles.colRemaining}>Zůstatek</Text>
            </View>

            {data.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20, fontSize: 10, fontStyle: 'italic' }}>Žádné závazky</Text>
            ) : (
                data.map((group, idx) => (
                    <View key={idx} wrap={false}>
                        <View style={styles.rowGroup}>
                            <Text style={styles.groupTitle}>{group.supplier_name}</Text>
                            <Text style={styles.groupTotal}>{currencyFormat(group.total_remaining)}</Text>
                        </View>
                        {group.documents.map((doc) => {
                            const remaining = doc.amount - (doc.paid_amount || 0);
                            return (
                                <View key={doc.id} style={styles.rowItem}>
                                    <Text style={styles.itemDoc}>{doc.number}</Text>
                                    <Text style={styles.itemIssue}>{formatDate(doc.issue_date)}</Text>
                                    <Text style={styles.itemDue}>{formatDate(doc.due_date)}</Text>
                                    <Text style={styles.itemAmount}>{currencyFormat(doc.amount, doc.currency)}</Text>
                                    <Text style={styles.itemPaid}>{currencyFormat(doc.paid_amount || 0, doc.currency)}</Text>
                                    <Text style={styles.itemRemaining}>{currencyFormat(remaining, doc.currency)}</Text>
                                </View>
                            );
                        })}
                    </View>
                ))
            )}

            <View style={styles.grandTotalRow} wrap={false}>
                <Text style={styles.grandTotalLabel}>Celkem k úhradě:</Text>
                <Text style={styles.grandTotalValue}>{currencyFormat(totalPayables)}</Text>
            </View>
        </AccountingPdfLayout>
    );
}
