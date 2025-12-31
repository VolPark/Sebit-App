import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { CompanyConfig } from '@/lib/companyConfig';

// Register Roboto font for Czech characters (proven to work)
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
    ]
});

const THEME_COLOR = process.env.NEXT_PUBLIC_PDF_THEME_COLOR || '#E30613';

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        padding: 30,
        fontFamily: 'Roboto',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: THEME_COLOR,
        paddingBottom: 10,
    },
    logo: {
        height: 50,
        objectFit: 'contain',
    },
    headerRight: {
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 24,
        color: THEME_COLOR,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    infoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        marginTop: 10,
    },
    infoBlock: {
        width: '45%',
    },
    label: {
        fontSize: 10,
        color: '#6b7280',
        marginBottom: 2,
    },
    value: {
        fontSize: 10,
        marginBottom: 2,
    },
    bold: {
        fontWeight: 'bold',
    },
    table: {
        width: '100%',
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f3f4f6',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        padding: 8,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        padding: 8,
    },
    colDate: { width: '15%' },
    colProject: { width: '25%' },
    colDesc: { width: '45%' },
    colHours: { width: '15%', textAlign: 'right' },

    headerText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#374151',
    },
    cellText: {
        fontSize: 10,
        color: '#374151',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 8,
        marginTop: 5,
        backgroundColor: THEME_COLOR,
    },
    totalText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    signatureSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 50,
    },
    signatureBlock: {
        width: '40%',
        alignItems: 'center',
    },
    signatureImage: {
        width: 150,
        height: 60,
        objectFit: 'contain',
        marginBottom: 5,
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#000',
        width: '100%',
        marginTop: 40,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 10,
    },
    footerText: {
        fontSize: 8,
        color: '#9ca3af',
    }
});

interface TimesheetItem {
    date: string;
    project: string;
    description: string;
    hours: number;
    clientName?: string; // For Worker report
    workerName?: string; // For Client report (Role or Name)
}

interface TimesheetPdfProps {
    reportType: 'worker' | 'client';
    period: string; // "Leden 2025"
    entityName: string; // Worker Name or Client Name
    items: TimesheetItem[];
    totalHours: number;
}

export default function TimesheetPdf({ reportType, period, entityName, items, totalHours }: TimesheetPdfProps) {
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Image style={styles.logo} src={CompanyConfig.branding.logoLightUrl} />
                    <View style={styles.headerRight}>
                        <Text style={styles.title}>VÝKAZ PRÁCE</Text>
                        <Text style={styles.subtitle}>{period}</Text>
                    </View>
                </View>

                {/* Info Blocks */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>POSKYTOVATEL</Text>
                        <Text style={[styles.value, styles.bold]}>{CompanyConfig.billing.companyName}</Text>
                        <Text style={styles.value}>{CompanyConfig.address.line1}</Text>
                        <Text style={styles.value}>{CompanyConfig.address.city}</Text>
                        <Text style={styles.value}>IČO: {CompanyConfig.billing.ico}</Text>
                    </View>

                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>{reportType === 'worker' ? 'PRACOVNÍK' : 'KLIENT'}</Text>
                        <Text style={[styles.value, styles.title, { fontSize: 16, color: '#000' }]}>{entityName}</Text>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.colDate, styles.headerText]}>Datum</Text>
                        {reportType === 'worker' && <Text style={[styles.colProject, styles.headerText, { width: '20%' }]}>Klient</Text>}
                        {reportType === 'client' && <Text style={[styles.colProject, styles.headerText, { width: '20%' }]}>Pracovník</Text>}
                        <Text style={[styles.colProject, styles.headerText, (reportType === 'worker' || reportType === 'client') ? { width: '20%' } : { width: '25%' }]}>Projekt</Text>
                        <Text style={[styles.colDesc, styles.headerText, (reportType === 'worker' || reportType === 'client') ? { width: '30%' } : { width: '45%' }]}>Popis</Text>
                        <Text style={[styles.colHours, styles.headerText]}>Hodiny</Text>
                    </View>

                    {items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.colDate, styles.cellText]}>{new Date(item.date).toLocaleDateString('cs-CZ')}</Text>

                            {reportType === 'worker' && (
                                <Text style={[styles.colProject, styles.cellText, { width: '20%' }]}>{item.clientName || '-'}</Text>
                            )}
                            {reportType === 'client' && (
                                <Text style={[styles.colProject, styles.cellText, { width: '20%' }]}>{item.workerName || '-'}</Text>
                            )}

                            <Text style={[styles.colProject, styles.cellText, (reportType === 'worker' || reportType === 'client') ? { width: '20%' } : { width: '25%' }]}>{item.project}</Text>
                            <Text style={[styles.colDesc, styles.cellText, (reportType === 'worker' || reportType === 'client') ? { width: '30%' } : { width: '45%' }]}>{item.description}</Text>
                            <Text style={[styles.colHours, styles.cellText]}>{item.hours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })}</Text>
                        </View>
                    ))}

                    <View style={styles.totalRow}>
                        <Text style={styles.totalText}>CELKEM: {totalHours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })} hod</Text>
                    </View>
                </View>

                {/* Signatures */}
                <View style={styles.signatureSection}>
                    <View style={[styles.signatureBlock, { alignItems: 'flex-start' }]}>
                        {CompanyConfig.branding.signatureUrl ? (
                            <>
                                <Image style={styles.signatureImage} src={CompanyConfig.branding.signatureUrl} />
                                <Text style={[styles.label, { fontSize: 11, fontWeight: 'bold' }]}>Schválil</Text>
                                <Text style={[styles.label, { fontSize: 7, color: '#9ca3af', fontStyle: 'italic', marginTop: 2 }]}>
                                    Tento dokument je podepsán elektronicky
                                </Text>
                            </>
                        ) : (
                            <>
                                <View style={styles.signatureLine} />
                                <Text style={styles.label}>Schválil (Podpis)</Text>
                            </>
                        )}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {CompanyConfig.billing.companyName} | {CompanyConfig.contact.web} | {CompanyConfig.contact.email}
                    </Text>
                    <Text style={styles.footerText}>
                        Generováno systémem {CompanyConfig.name}
                    </Text>
                </View>
            </Page>
        </Document>
    );
}
