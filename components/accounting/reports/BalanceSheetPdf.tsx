import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { AccountingPdfLayout, pdfStyles, pdfConstants } from './AccountingPdfLayout';

interface Item {
    account: string;
    name?: string;
    balance: number;
    isTotal?: boolean;
}

interface Group {
    id: string;
    name: string;
    balance: number;
    accounts: Item[];
}

interface BalanceSheetData {
    assets: Group[];
    liabilities: Group[];
    totals: {
        assets: number;
        liabilities: number;
        diff: number;
    };
}

interface BalanceSheetPdfProps {
    data: BalanceSheetData;
    year: number;
}

const styles = StyleSheet.create({
    columnsContainer: {
        flexDirection: 'row',
        gap: 20,
    },
    column: {
        flex: 1,
    },
    columnHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: pdfConstants.secondaryColor,
        borderBottomWidth: 1,
        borderBottomColor: pdfConstants.themeColor,
        padding: 8,
        marginBottom: 10,
    },
    columnTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: pdfConstants.sectionTextColor,
    },
    columnTotal: {
        fontSize: 12,
        fontWeight: 'bold',
        color: pdfConstants.sectionTextColor,
    },
    groupRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f9fafb',
        padding: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        marginTop: 5,
    },
    groupName: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#374151',
    },
    groupValue: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#374151',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
        paddingHorizontal: 5,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f9fafb',
    },
    itemLabel: {
        fontSize: 8,
        color: '#4b5563',
        paddingLeft: 10,
    },
    itemValue: {
        fontSize: 8,
        color: '#4b5563',
    },
    warningBox: {
        marginTop: 20,
        padding: 10,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 4,
    },
    warningText: {
        color: '#991b1b',
        fontSize: 10,
        fontWeight: 'bold',
    },
    // Inherited from pdfStyles can be used directly in style prop usually
    textSmall: pdfStyles.textSmall,
});

export function BalanceSheetPdf({ data, year }: BalanceSheetPdfProps) {
    const currencyFormat = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 }).format(val);
    };

    return (
        <AccountingPdfLayout
            title="Rozvaha (Balance Sheet)"
            period={`Rok ${year}`}
            orientation="landscape"
        >
            <View style={styles.columnsContainer}>
                {/* Assets Column */}
                <View style={styles.column}>
                    <View style={styles.columnHeader}>
                        <Text style={styles.columnTitle}>AKTIVA</Text>
                        <Text style={styles.columnTotal}>{currencyFormat(data.totals.assets)}</Text>
                    </View>
                    {data.assets.length === 0 ? (
                        <Text style={[styles.textSmall, { textAlign: 'center', margin: 10, fontStyle: 'italic' }]}>Žádná data</Text>
                    ) : (
                        data.assets.map((group, idx) => (
                            <View key={idx} wrap={false}>
                                <View style={styles.groupRow}>
                                    <Text style={styles.groupName}>{group.name}</Text>
                                    <Text style={styles.groupValue}>{currencyFormat(group.balance)}</Text>
                                </View>
                                {group.accounts.map((item, iIdx) => (
                                    <View key={iIdx} style={styles.itemRow}>
                                        <Text style={styles.itemLabel}>
                                            {item.account} {item.name ? `(${item.name})` : ''}
                                        </Text>
                                        <Text style={styles.itemValue}>{currencyFormat(item.balance)}</Text>
                                    </View>
                                ))}
                            </View>
                        ))
                    )}
                </View>

                {/* Liabilities Column */}
                <View style={styles.column}>
                    <View style={styles.columnHeader}>
                        <Text style={styles.columnTitle}>PASIVA</Text>
                        <Text style={styles.columnTotal}>{currencyFormat(data.totals.liabilities)}</Text>
                    </View>
                    {data.liabilities.length === 0 ? (
                        <Text style={[styles.textSmall, { textAlign: 'center', margin: 10, fontStyle: 'italic' }]}>Žádná data</Text>
                    ) : (
                        data.liabilities.map((group, idx) => (
                            <View key={idx} wrap={false}>
                                <View style={styles.groupRow}>
                                    <Text style={styles.groupName}>{group.name}</Text>
                                    <Text style={styles.groupValue}>{currencyFormat(group.balance)}</Text>
                                </View>
                                {group.accounts.map((item, iIdx) => (
                                    <View key={iIdx} style={styles.itemRow}>
                                        <Text style={[styles.itemLabel, item.isTotal ? { fontWeight: 'bold', color: '#b45309' } : {}]}>
                                            {item.account} {item.name ? `(${item.name})` : ''}
                                        </Text>
                                        <Text style={[styles.itemValue, item.isTotal ? { fontWeight: 'bold', color: '#b45309' } : {}]}>
                                            {currencyFormat(item.balance)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ))
                    )}
                </View>
            </View>

            {/* Warning if diff */}
            {Math.abs(data.totals.diff) > 0.01 && (
                <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                        Pozor: Rozvaha se nerovná! Rozdíl: {currencyFormat(data.totals.diff)}
                    </Text>
                </View>
            )}
        </AccountingPdfLayout>
    );
}
