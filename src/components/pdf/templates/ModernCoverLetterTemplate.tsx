import React from 'react';
import { Page, Text, View, StyleSheet, Document, Image, Svg, Path } from '@react-pdf/renderer';
import { t } from '../../../i18n';

const PhoneIcon = () => (
  <Svg viewBox="0 0 24 24" width={10} height={10}>
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EmailIcon = () => (
  <Svg viewBox="0 0 24 24" width={10} height={10}>
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 6l-10 7L2 6" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LocationIcon = () => (
  <Svg viewBox="0 0 24 24" width={10} height={10}>
    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LinkIcon = () => (
  <Svg viewBox="0 0 24 24" width={10} height={10}>
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 30,
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontFamily: 'Noto Sans',
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 15,
  },
  headerText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: 1.2,
  },
  jobTitle: {
    fontSize: 12,
    color: '#1e3a8a',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: 12,
    lineHeight: 1.2,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 8,
    color: '#64748b',
  },
  photo: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginLeft: 20,
    objectFit: 'cover',
  },
  text: {
    fontSize: 9.5,
    color: '#334155',
    marginBottom: 4,
    lineHeight: 1.6,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
});

export const ModernCoverLetterTemplate = ({ data, profile, jobInfo, appLanguage, showPhoto = true }: any) => {
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
          <View style={styles.headerText}>
            <Text style={styles.name}>{personalInfo.fullName}</Text>
            {displayJobTitle && <Text style={styles.jobTitle}>{displayJobTitle}</Text>}
            
            <View style={styles.contactRow}>
              {personalInfo.email && (
                <View style={styles.contactItem}>
                  <EmailIcon />
                  <Text style={styles.contactText}>{personalInfo.email}</Text>
                </View>
              )}
              {personalInfo.phone && (
                <View style={styles.contactItem}>
                  <PhoneIcon />
                  <Text style={styles.contactText}>{personalInfo.phone}</Text>
                </View>
              )}
              {personalInfo.location && (
                <View style={styles.contactItem}>
                  <LocationIcon />
                  <Text style={styles.contactText}>{personalInfo.location}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.contactRow}>
              {personalInfo.linkedin && (
                <View style={styles.contactItem}>
                  <LinkIcon />
                  <Text style={styles.contactText}>LinkedIn: {personalInfo.linkedin.replace('https://', '')}</Text>
                </View>
              )}
              {personalInfo.github && (
                <View style={styles.contactItem}>
                  <LinkIcon />
                  <Text style={styles.contactText}>GitHub: {personalInfo.github.replace('https://', '')}</Text>
                </View>
              )}
              {personalInfo.portfolio && (
                <View style={styles.contactItem}>
                  <LinkIcon />
                  <Text style={styles.contactText}>Portfolio: {personalInfo.portfolio.replace('https://', '')}</Text>
                </View>
              )}
            </View>
          </View>
          {showPhoto && personalInfo.photoURL && (
            <Image src={personalInfo.photoURL} style={styles.photo} />
          )}
        </View>

        <View style={{ marginBottom: 25, marginTop: 10 }}>
          <Text style={[styles.text, { textAlign: 'right', marginBottom: 25 }]}>{date}</Text>
          <Text style={[styles.text, { fontWeight: 700, fontSize: 10 }]}>{company}</Text>
          <Text style={[styles.text, { color: '#64748b' }]}>{t('applicationFor', appLanguage)}: {position}</Text>
        </View>

        <View style={{ marginBottom: 30 }}>
          <Text style={[styles.text, { marginBottom: 15 }]}>{t('dearHiringManager', appLanguage)},</Text>
          <Text style={[styles.text, { marginBottom: 20 }]}>{data.coverLetter || t('coverLetterPlaceholder', appLanguage)}</Text>
          <Text style={[styles.text, { marginTop: 25 }]}>{t('sincerely', appLanguage)},</Text>
          <Text style={[styles.text, { marginTop: 15, fontWeight: 700, fontSize: 10 }]}>{personalInfo.fullName}</Text>
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
