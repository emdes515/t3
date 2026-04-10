import React from 'react';
import { Page, Text, View, StyleSheet, Document, Image } from '@react-pdf/renderer';
import { t } from '../../../i18n';

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontFamily: 'Noto Serif',
    fontSize: 10,
    lineHeight: 1.6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 20,
  },
  name: {
    fontSize: 26,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 10,
    textAlign: 'center',
    lineHeight: 1.2,
  },
  jobTitle: {
    fontSize: 12,
    color: '#334155',
    fontWeight: 400,
    textTransform: 'uppercase',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 1.2,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  },
  contactText: {
    fontSize: 9,
    color: '#475569',
    fontFamily: 'Noto Sans',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
    objectFit: 'cover',
  },
  text: {
    fontSize: 10,
    color: '#334155',
    marginBottom: 4,
    lineHeight: 1.6,
    fontFamily: 'Noto Sans',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    fontFamily: 'Noto Sans',
  },
});

export const ClassicCoverLetterTemplate = ({ data, profile, jobInfo, appLanguage, showPhoto = true }: any) => {
  const personalInfo = { ...profile.personalInfo, ...data.personalInfo };
  const company = jobInfo?.basic_info?.company_name || jobInfo?.company || data.company || '';
  const position = jobInfo?.basic_info?.job_title || jobInfo?.position || data.position || '';
  const date = new Date().toLocaleDateString();

  const companyName = company ? ` dla ${company}` : '';
  const companyNameEn = company ? ` for ${company}` : '';

  const displayJobTitle = personalInfo.jobTitle || jobInfo?.basic_info?.job_title || jobInfo?.position;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {showPhoto && personalInfo.photoURL && (
            <Image src={personalInfo.photoURL} style={styles.photo} />
          )}
          <Text style={styles.name}>{personalInfo.fullName}</Text>
          {displayJobTitle && <Text style={styles.jobTitle}>{displayJobTitle}</Text>}
          
          <View style={styles.contactRow}>
            {personalInfo.email && <Text style={styles.contactText}>{personalInfo.email}</Text>}
            {personalInfo.phone && <Text style={styles.contactText}>• {personalInfo.phone}</Text>}
            {personalInfo.location && <Text style={styles.contactText}>• {personalInfo.location}</Text>}
          </View>
          
          <View style={styles.contactRow}>
            {personalInfo.linkedin && <Text style={styles.contactText}>LinkedIn: {personalInfo.linkedin.replace('https://', '')}</Text>}
            {personalInfo.github && <Text style={styles.contactText}>GitHub: {personalInfo.github.replace('https://', '')}</Text>}
            {personalInfo.portfolio && <Text style={styles.contactText}>Portfolio: {personalInfo.portfolio.replace('https://', '')}</Text>}
          </View>
        </View>

        <View style={{ marginBottom: 25, marginTop: 10 }}>
          <Text style={[styles.text, { textAlign: 'right', marginBottom: 25 }]}>{date}</Text>
          <Text style={[styles.text, { fontWeight: 700, fontSize: 11 }]}>{company}</Text>
          <Text style={[styles.text, { color: '#64748b' }]}>{t('applicationFor', appLanguage)}: {position}</Text>
        </View>

        <View style={{ marginBottom: 30 }}>
          <Text style={[styles.text, { marginBottom: 15 }]}>{t('dearHiringManager', appLanguage)},</Text>
          <Text style={[styles.text, { marginBottom: 20 }]}>{data.coverLetter || t('coverLetterPlaceholder', appLanguage)}</Text>
          <Text style={[styles.text, { marginTop: 25 }]}>{t('sincerely', appLanguage)},</Text>
          <Text style={[styles.text, { marginTop: 15, fontWeight: 700, fontSize: 11 }]}>{personalInfo.fullName}</Text>
        </View>

        <Text style={styles.footer} fixed>
          {appLanguage === 'pl' 
            ? `Wyrażam zgodę na przetwarzanie moich danych osobowych dla potrzeb niezbędnych do realizacji procesu rekrutacji${companyName} (zgodnie z ustawą z dnia 10 maja 2018 roku o ochronie danych osobowych (Dz. Ustaw z 2018, poz. 1000) oraz zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. w sprawie ochrony osób fizycznych w związku z przetwarzaniem danych osobowych i w sprawie swobodnego przepływu takich danych oraz uchylenia dyrektywy 95/46/WE (RODO)).`
            : `I agree to the processing of personal data provided in this document for realising the recruitment process${companyNameEn} pursuant to the Personal Data Protection Act of 10 May 2018 (Journal of Laws 2018, item 1000) and in agreement with Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016 on the protection of natural persons with regard to the processing of personal data and on the free movement of such data, and repealing Directive 95/46/EC (General Data Protection Regulation).`}
        </Text>
      </Page>
    </Document>
  );
};
