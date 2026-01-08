import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { CompanyConfig } from '@/lib/companyConfig';

// Register Roboto font for Czech characters
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
        { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 }
    ]
});

const THEME_COLOR = process.env.NEXT_PUBLIC_PDF_THEME_COLOR || '#E30613';
// Dynamic Secondary Color Logic matching TimesheetPdf
const IS_SEBIT = (CompanyConfig.name.toUpperCase().includes('SEBIT') || THEME_COLOR === '#C6FF00' || THEME_COLOR === '#002B5C');
const DEFAULT_SECONDARY = '#f3f4f6';
const SECONDARY_COLOR = process.env.NEXT_PUBLIC_PDF_SECONDARY_COLOR || DEFAULT_SECONDARY;
const SECTION_TEXT_COLOR = IS_SEBIT ? '#002B5C' : THEME_COLOR;

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
    },
    pageNumber: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        fontSize: 8,
        color: '#9ca3af',
    }
});

interface AccountingPdfLayoutProps {
    title: string;
    period?: string; // e.g. "Leden 2025" or "31.12.2024"
    orientation?: 'portrait' | 'landscape';
    children: React.ReactNode;
}

export function AccountingPdfLayout({ title, period, orientation = 'landscape', children }: AccountingPdfLayoutProps) {
    const currentDate = new Date().toLocaleDateString('cs-CZ');

    return (
        <Document>
            <Page size="A4" orientation={orientation} style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Image style={styles.logo} src={CompanyConfig.branding.logoLightUrl} />
                    <View style={styles.headerRight}>
                        <Text style={styles.title}>{title}</Text>
                        {period && <Text style={styles.subtitle}>{period}</Text>}
                    </View>
                </View>

                {/* Info Blocks - Standard Accounting Header */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoBlock}>
                        <Text style={styles.label}>ÚČETNÍ JEDNOTKA</Text>
                        <Text style={[styles.value, styles.bold]}>{CompanyConfig.billing.companyName}</Text>
                        <Text style={styles.value}>{CompanyConfig.address.line1}</Text>
                        <Text style={styles.value}>{CompanyConfig.address.city}</Text>
                        <Text style={styles.value}>IČO: {CompanyConfig.billing.ico}</Text>
                    </View>

                    <View style={[styles.infoBlock, { alignItems: 'flex-end' }]}>
                        <Text style={styles.label}>VYGENEROVÁNO</Text>
                        <Text style={[styles.value, styles.bold]}>{currentDate}</Text>
                        <Text style={styles.label}>SOFTWARE</Text>
                        <Text style={styles.value}>{CompanyConfig.name}</Text>
                    </View>
                </View>

                {/* Content */}
                {children}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        {CompanyConfig.billing.companyName} | {CompanyConfig.contact.web} | {CompanyConfig.contact.email}
                    </Text>
                    <Text style={[styles.footerText, { marginTop: 2 }]}>
                        Generováno systémem {CompanyConfig.name}
                    </Text>
                </View>

                <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
                    `${pageNumber} / ${totalPages}`
                )} fixed />
            </Page>
        </Document>
    );
}

// Export constants separately
export const pdfConstants = {
    themeColor: THEME_COLOR,
    secondaryColor: SECONDARY_COLOR,
    sectionTextColor: SECTION_TEXT_COLOR,
};

// Export styles that might be useful for child components
export const pdfStyles = StyleSheet.create({
    ...styles,
    // Helpers
    textSmall: {
        fontSize: 9,
    },
    textBold: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    // Helper helpers can't be just objects if not valid React-PDF styles, 
    // so we define them as valid partial styles
    tableHeaderV2: {
        flexDirection: 'row',
        backgroundColor: SECONDARY_COLOR,
        borderBottomWidth: 1,
        borderBottomColor: THEME_COLOR,
        padding: 5,
        alignItems: 'center',
    },
    tableRowV2: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        padding: 5,
        alignItems: 'center',
    }
});
