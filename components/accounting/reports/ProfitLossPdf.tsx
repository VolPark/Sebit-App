import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { AccountingPdfLayout, pdfStyles, pdfConstants } from './AccountingPdfLayout';

interface PnlItem {
    account: string;
    name: string;
    balance: number;
}

interface PnlGroup {
    id: string;
    name: string;
    balance: number;
    accounts: PnlItem[];
}

interface ProfitLossData {
    operating: { revenues: PnlGroup[], costs: PnlGroup[], result: number };
    financial: { revenues: PnlGroup[], costs: PnlGroup[], result: number };
    tax: { costs: PnlGroup[], total: number };
    results: { beforeTax: number, afterTax: number };
}

interface ProfitLossPdfProps {
    data: ProfitLossData;
    year: number;
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        backgroundColor: '#e5e7eb',
        padding: 5,
        marginTop: 10,
        marginBottom: 5,
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#f3f4f6',
        paddingVertical: 2,
    },
    rowGroup: {
        backgroundColor: '#f9fafb',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    colLabel: {
        flex: 1,
        fontSize: 9,
        paddingLeft: 5,
    },
    colValue: {
        width: 100,
        fontSize: 9,
        textAlign: 'right',
        paddingRight: 5,
    },
    resultRow: {
        flexDirection: 'row',
        backgroundColor: pdfConstants.secondaryColor,
        borderTopWidth: 1,
        borderTopColor: pdfConstants.themeColor,
        padding: 5,
        marginTop: 5,
    },
    resultLabel: {
        flex: 1,
        fontSize: 10,
        fontWeight: 'bold',
        color: pdfConstants.sectionTextColor,
    },
    resultValue: {
        width: 100,
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'right',
        color: pdfConstants.sectionTextColor,
    },
    grandTotalRow: {
        flexDirection: 'row',
        backgroundColor: '#fffbeb', // Amber-50 equivalent-ish
        borderTopWidth: 2,
        borderTopColor: '#f59e0b',
        padding: 8,
        marginTop: 15,
    },
    grandTotalLabel: {
        flex: 1,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#92400e',
    },
    grandTotalValue: {
        width: 100,
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'right',
        color: '#92400e',
    },
    groupName: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#374151',
    },
    itemLabel: {
        fontSize: 8,
        color: '#4b5563',
        paddingLeft: 15,
    },
    itemValue: {
        fontSize: 8,
        color: '#4b5563',
    }
});

function GroupSection({ groups, isCost = false, currencyFormat }: { groups: PnlGroup[], isCost?: boolean, currencyFormat: (val: number) => string }) {
    return (
        <View>
            {groups.map((g, idx) => (
                <View key={idx} wrap={false}>
                    <View style={[styles.row, styles.rowGroup]}>
                        <Text style={[styles.colLabel, styles.groupName]}>{g.name}</Text>
                        <Text style={[styles.colValue, styles.groupName, { fontWeight: 'bold' }]}>
                            {isCost ? '-' : ''}{currencyFormat(g.balance)}
                        </Text>
                    </View>
                    {g.accounts.map((item, iIdx) => (
                        <View key={iIdx} style={styles.row}>
                            <Text style={[styles.colLabel, styles.itemLabel]}>{item.account} - {item.name}</Text>
                            <Text style={[styles.colValue, styles.itemValue]}>{currencyFormat(item.balance)}</Text>
                        </View>
                    ))}
                </View>
            ))}
        </View>
    );
}

export function ProfitLossPdf({ data, year }: ProfitLossPdfProps) {
    const currencyFormat = (val: number) => {
        return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 2 }).format(val);
    };

    return (
        <AccountingPdfLayout
            title="Výsledovka (Profit & Loss)"
            period={`Rok ${year}`}
            orientation="portrait"
        >
            {/* OPERATING */}
            <Text style={styles.sectionTitle}>PROVOZNÍ VÝSLEDEK HOSPODAŘENÍ</Text>
            {data.operating.revenues.length > 0 && (
                <View>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2, marginTop: 5 }}>VÝNOSY</Text>
                    <GroupSection groups={data.operating.revenues} currencyFormat={currencyFormat} />
                </View>
            )}
            {data.operating.costs.length > 0 && (
                <View>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2, marginTop: 5 }}>NÁKLADY</Text>
                    <GroupSection groups={data.operating.costs} isCost={true} currencyFormat={currencyFormat} />
                </View>
            )}
            <View style={styles.resultRow} wrap={false}>
                <Text style={styles.resultLabel}>* Provozní výsledek hospodaření</Text>
                <Text style={styles.resultValue}>{currencyFormat(data.operating.result)}</Text>
            </View>

            {/* FINANCIAL */}
            <Text style={styles.sectionTitle}>FINANČNÍ VÝSLEDEK HOSPODAŘENÍ</Text>
            {data.financial.revenues.length > 0 && (
                <View>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2, marginTop: 5 }}>VÝNOSY</Text>
                    <GroupSection groups={data.financial.revenues} currencyFormat={currencyFormat} />
                </View>
            )}
            {data.financial.costs.length > 0 && (
                <View>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 2, marginTop: 5 }}>NÁKLADY</Text>
                    <GroupSection groups={data.financial.costs} isCost={true} currencyFormat={currencyFormat} />
                </View>
            )}
            <View style={styles.resultRow} wrap={false}>
                <Text style={styles.resultLabel}>* Finanční výsledek hospodaření</Text>
                <Text style={styles.resultValue}>{currencyFormat(data.financial.result)}</Text>
            </View>

            {/* TAX */}
            <Text style={styles.sectionTitle}>DAŇ Z PŘÍJMŮ</Text>
            <GroupSection groups={data.tax.costs} isCost={true} currencyFormat={currencyFormat} />

            {/* TOTAL */}
            <View style={styles.grandTotalRow} wrap={false}>
                <Text style={styles.grandTotalLabel}>** Výsledek hospodaření za účetní období</Text>
                <Text style={styles.grandTotalValue}>{currencyFormat(data.results.afterTax)}</Text>
            </View>

        </AccountingPdfLayout>
    );
}
