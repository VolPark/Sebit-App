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
const SECONDARY_COLOR = process.env.NEXT_PUBLIC_PDF_SECONDARY_COLOR || '#f3f4f6'; // Default to light gray instead of Navy

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
    workerRole?: string;
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

                {/* Content based on Report Type */}
                {reportType === 'worker' ? (
                    (() => {
                        // Group items by Client Name
                        const groups: { [key: string]: TimesheetItem[] } = {};
                        items.forEach(item => {
                            const client = item.clientName || 'Ostatní';
                            if (!groups[client]) groups[client] = [];
                            groups[client].push(item);
                        });

                        // Sort by Client Name
                        const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));

                        return sortedKeys.map((clientName, groupIndex) => {
                            const clientItems = groups[clientName];
                            const clientTotalHours = clientItems.reduce((sum, item) => sum + item.hours, 0);

                            // Group by Project within this Client
                            const projectGroups: { [key: string]: TimesheetItem[] } = {};
                            clientItems.forEach(item => {
                                const project = item.project || 'Bez projektu';
                                if (!projectGroups[project]) projectGroups[project] = [];
                                projectGroups[project].push(item);
                            });
                            const sortedProjects = Object.keys(projectGroups).sort((a, b) => a.localeCompare(b));

                            return (
                                <View key={groupIndex} style={{ marginBottom: 20 }} break={groupIndex > 0}>
                                    {/* Client Header */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, backgroundColor: SECONDARY_COLOR, padding: 8, borderRadius: 2 }}>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: THEME_COLOR }}>
                                            {clientName}
                                        </Text>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME_COLOR }}>
                                            Celkem: {clientTotalHours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })} hod / {(clientTotalHours / 8).toFixed(2)} MD
                                        </Text>
                                    </View>

                                    {/* Projects Loop */}
                                    {sortedProjects.map((projectName, projectIndex) => {
                                        const projectItems = projectGroups[projectName];
                                        const projectTotalHours = projectItems.reduce((sum, item) => sum + item.hours, 0);

                                        return (
                                            <View key={projectIndex} style={{ marginBottom: 15, paddingLeft: 10 }}>
                                                {/* Project Header */}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, backgroundColor: SECONDARY_COLOR, padding: 4, borderRadius: 2 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: THEME_COLOR, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                        {projectName}
                                                    </Text>
                                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: THEME_COLOR }}>
                                                        {projectTotalHours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })} hod / {(projectTotalHours / 8).toFixed(2)} MD
                                                    </Text>
                                                </View>

                                                {/* Table for this Project */}
                                                <View style={[styles.table, { marginBottom: 0 }]}>
                                                    <View style={styles.tableHeader}>
                                                        <Text style={[styles.colDate, styles.headerText]}>Datum</Text>
                                                        <Text style={[styles.colDesc, styles.headerText, { width: '70%' }]}>Popis</Text>
                                                        <Text style={[styles.colHours, styles.headerText]}>Hodiny</Text>
                                                    </View>
                                                    {projectItems.map((item, index) => (
                                                        <View key={index} style={styles.tableRow}>
                                                            <Text style={[styles.colDate, styles.cellText]}>{new Date(item.date).toLocaleDateString('cs-CZ')}</Text>
                                                            <Text style={[styles.colDesc, styles.cellText, { width: '70%' }]}>{item.description}</Text>
                                                            <Text style={[styles.colHours, styles.cellText]}>{item.hours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        });
                    })()
                ) : (
                    // Client Report - Grouped by Role + Worker

                    (() => {
                        // Group items by Worker Role + Name
                        // Key format: "Role|Name" to allow easy sorting/splitting
                        const groups: { [key: string]: TimesheetItem[] } = {};
                        items.forEach(item => {
                            // Prefer Role grouping first? User said "combination".
                            const role = item.workerRole || 'Ostatní';
                            const name = item.workerName || 'Neznámý';
                            const key = `${role}|${name}`;

                            if (!groups[key]) groups[key] = [];
                            groups[key].push(item);
                        });

                        // Sort by Role then Name
                        const sortedKeys = Object.keys(groups).sort((a, b) => {
                            const [roleA, nameA] = a.split('|');
                            const [roleB, nameB] = b.split('|');

                            if (roleA !== roleB) return roleA.localeCompare(roleB);
                            return nameA.localeCompare(nameB);
                        });

                        return sortedKeys.map((key, groupIndex) => {
                            const groupItems = groups[key];
                            const [role, name] = key.split('|');
                            // If role is 'Ostatní' (and was fallback), maybe don't show it if it's the only one? 
                            // But 'Ostatní' implies missing role.
                            // Let's use clean separate variables.
                            const displayRole = role === 'Ostatní' ? '' : role;

                            const headerTitle = displayRole ? `${displayRole} - ${name}` : name;
                            const workerTotalHours = groupItems.reduce((sum, item) => sum + item.hours, 0);

                            return (
                                <View key={groupIndex} style={{ marginBottom: 20 }} break={groupIndex > 0}>
                                    {/* Worker Header */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, backgroundColor: SECONDARY_COLOR, padding: 5, borderRadius: 2 }}>
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: THEME_COLOR }}>
                                            {headerTitle}
                                        </Text>
                                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: THEME_COLOR }}>
                                            Celkem: {workerTotalHours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })} hod / {(workerTotalHours / 8).toFixed(2)} MD
                                        </Text>
                                    </View>

                                    {/* Table for this Worker */}
                                    <View style={[styles.table, { marginBottom: 5 }]}>
                                        <View style={styles.tableHeader}>
                                            <Text style={[styles.colDate, styles.headerText]}>Datum</Text>
                                            {/* Worker Column Removed */}
                                            <Text style={[styles.colProject, styles.headerText, { width: '25%' }]}>Projekt</Text>
                                            <Text style={[styles.colDesc, styles.headerText, { width: '45%' }]}>Popis</Text>
                                            <Text style={[styles.colHours, styles.headerText]}>Hodiny</Text>
                                        </View>
                                        {groupItems.map((item, index) => (
                                            <View key={index} style={styles.tableRow}>
                                                <Text style={[styles.colDate, styles.cellText]}>{new Date(item.date).toLocaleDateString('cs-CZ')}</Text>
                                                <Text style={[styles.colProject, styles.cellText, { width: '25%' }]}>{item.project}</Text>
                                                <Text style={[styles.colDesc, styles.cellText, { width: '45%' }]}>{item.description}</Text>
                                                <Text style={[styles.colHours, styles.cellText]}>{item.hours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            );
                        });
                    })()

                )}

                {/* Total Row (Global) */}
                <View style={[styles.totalRow, { marginTop: 0 }]}>
                    <Text style={styles.totalText}>CELKEM: {totalHours.toLocaleString('cs-CZ', { minimumFractionDigits: 1 })} hod / {(totalHours / 8).toFixed(2)} MD</Text>
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
