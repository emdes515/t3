import React from 'react';
import { Page, Text, View, StyleSheet, Image, Document, Link } from '@react-pdf/renderer';
import { getGenderedTitle } from '../../../lib/utils';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  } else if (parts.length === 2) {
    return `${parts[1]}/${parts[0]}`; // MM/YYYY
  }
  return dateString;
};

const styles = StyleSheet.create({
  page: {
    padding: 0,
    paddingBottom: 60,
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontFamily: 'Noto Serif',
    fontSize: 10,
    lineHeight: 1.6,
  },
  container: {
    flexDirection: 'row',
    height: '100%',
  },
  sidebar: {
    width: '28%',
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    padding: 25,
    paddingTop: 40,
    height: '100%',
  },
  main: {
    width: '72%',
    padding: 40,
    paddingTop: 40,
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 20,
    objectFit: 'cover',
    alignSelf: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
    lineHeight: 1.2,
  },
  jobTitle: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 400,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 25,
    textAlign: 'center',
  },
  sidebarSection: {
    marginBottom: 20,
  },
  sidebarTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
  },
  contactText: {
    fontSize: 8,
    color: '#475569',
    marginBottom: 6,
    fontFamily: 'Noto Sans',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    paddingBottom: 4,
    marginBottom: 15,
  },
  text: {
    fontSize: 9,
    color: '#334155',
    marginBottom: 4,
    lineHeight: 1.6,
    fontFamily: 'Noto Sans',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 4,
  },
  bullet: {
    width: 10,
    fontSize: 9,
    color: '#0f172a',
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.6,
    fontFamily: 'Noto Sans',
  },
  experienceItem: {
    marginBottom: 18,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  position: {
    fontSize: 10,
    fontWeight: 700,
    color: '#1e293b',
  },
  date: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: 400,
    fontFamily: 'Noto Sans',
  },
  company: {
    fontSize: 9.5,
    color: '#334155',
    fontWeight: 700,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillItem: {
    fontSize: 8.5,
    color: '#334155',
    fontFamily: 'Noto Sans',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
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

export const ClassicTemplate = ({ data, profile, jobInfo, appLanguage, showPhoto = true, showSkillLevels = true }: any) => {
  const personalInfo = { ...profile.personalInfo, ...data.personalInfo, socialLinks: profile.personalInfo.socialLinks };
  const tailoredExp = data.tailoredExperience || data.experience || profile.experience;
  const tailoredSkills = data.tailoredSkills || profile.skills;
  const tailoredProjects = data.projects || data.tailoredProjects || profile.projects;
  const tailoredCertificates = data.tailoredCertificates || profile.certifications;
  const tailoredCourses = data.tailoredCourses || profile.courses;
  const tailoredBio = data.tailoredSummary || data.tailoredBio || profile.personalInfo.bio;
  const displayLanguages = data.languages?.length > 0 ? data.languages : profile.languages;

  const renderTextWithBullets = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        return (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>{trimmedLine.substring(1).trim()}</Text>
          </View>
        );
      }
      return <Text key={i} style={styles.text}>{trimmedLine}</Text>;
    });
  };

  const companyName = jobInfo?.basic_info?.company_name || jobInfo?.company ? ` dla ${jobInfo?.basic_info?.company_name || jobInfo?.company}` : '';
  const companyNameEn = jobInfo?.basic_info?.company_name || jobInfo?.company ? ` for ${jobInfo?.basic_info?.company_name || jobInfo?.company}` : '';

  const displayJobTitle = getGenderedTitle(
    (personalInfo.jobTitle || jobInfo?.basic_info?.job_title || jobInfo?.position || ''),
    personalInfo.gender
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          {/* Sidebar: Only Personal Info */}
          <View style={styles.sidebar}>
            {showPhoto && personalInfo.photoURL && (
              <Image src={personalInfo.photoURL} style={styles.photo} />
            )}
            <Text style={styles.name}>{personalInfo.fullName}</Text>
            {displayJobTitle && <Text style={styles.jobTitle}>{displayJobTitle}</Text>}

            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarTitle}>{appLanguage === 'pl' ? 'Kontakt' : 'Contact'}</Text>
              {personalInfo.email && <Text style={styles.contactText}>{personalInfo.email}</Text>}
              {personalInfo.phone && <Text style={styles.contactText}>{personalInfo.phone}</Text>}
              {personalInfo.location && <Text style={styles.contactText}>{personalInfo.location}</Text>}
            </View>

            {personalInfo.socialLinks?.length > 0 && (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarTitle}>{appLanguage === 'pl' ? 'Linki' : 'Links'}</Text>
                {personalInfo.socialLinks.map((link: any, idx: number) => (
                  <Text key={idx} style={styles.contactText}>{link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Main Content: Everything else */}
          <View style={styles.main}>
            {tailoredBio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Podsumowanie' : 'Summary'}</Text>
                <Text style={styles.text}>{tailoredBio}</Text>
              </View>
            )}

            {tailoredExp?.filter((exp: any) => !exp.omit).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Doświadczenie' : 'Experience'}</Text>
                {tailoredExp.filter((exp: any) => !exp.omit).map((exp: any, idx: number) => {
                  const originalExp = profile.experience?.find((e: any) => e.id === exp.id) || profile.experience?.find((e: any) => e.company === exp.company) || {};
                  return (
                    <View key={idx} style={styles.experienceItem} wrap={false}>
                      <View style={styles.experienceHeader}>
                        <Text style={styles.position}>{exp.position || originalExp.position}</Text>
                        <Text style={styles.date}>
                          {formatDate(originalExp.startDate || exp.startDate)} - {originalExp.isCurrent ? (appLanguage === 'pl' ? 'Obecnie' : 'Present') : formatDate(originalExp.endDate || exp.endDate)}
                        </Text>
                      </View>
                      <Text style={styles.company}>{originalExp.company || exp.company}</Text>
                      <View>
                        {renderTextWithBullets(exp.tailoredDescription || originalExp.description || exp.description)}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {tailoredSkills?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Umiejętności' : 'Skills'}</Text>
                <View style={styles.skillsContainer}>
                  {tailoredSkills.map((s: string | any, i: number) => {
                    const skillName = typeof s === 'string' ? s : s.name;
                    const originalSkill = profile.skills?.find((ps: any) => ps.name.toLowerCase() === skillName.toLowerCase());
                    const level = originalSkill?.level;
                    return (
                      <Text key={i} style={styles.skillItem}>
                        {skillName}{showSkillLevels && level ? ` - ${level}` : ''}
                      </Text>
                    );
                  })}
                </View>
              </View>
            )}

            {profile.education?.filter((e: any) => e.school || e.degree).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Wykształcenie' : 'Education'}</Text>
                {profile.education.filter((e: any) => e.school || e.degree).map((edu: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 10 }}>
                    <View style={styles.experienceHeader}>
                      <Text style={styles.company}>{edu.school}</Text>
                      <Text style={styles.date}>{formatDate(edu.startDate)} - {edu.isCurrent ? (appLanguage === 'pl' ? 'Obecnie' : 'Present') : formatDate(edu.endDate)}</Text>
                    </View>
                    <Text style={styles.text}>{edu.degree} - {edu.field}</Text>
                  </View>
                ))}
              </View>
            )}

            {tailoredProjects?.filter((p: any) => !p.omit).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Projekty' : 'Projects'}</Text>
                {tailoredProjects.filter((p: any) => !p.omit).map((proj: any, idx: number) => {
                  const originalProj = profile.projects?.find((p: any) => p.id === proj.id) || {};
                  return (
                    <View key={idx} style={styles.experienceItem} wrap={false}>
                      <View style={styles.experienceHeader}>
                        <Text style={styles.position}>{proj.name || originalProj.name}</Text>
                        <Text style={styles.date}>{proj.year || originalProj.year}</Text>
                      </View>
                      <View>
                        {renderTextWithBullets(proj.tailoredDescription || originalProj.description || proj.description)}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {tailoredCertificates?.filter((c: any) => !c.omit).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Certyfikaty' : 'Certifications'}</Text>
                {tailoredCertificates.filter((c: any) => !c.omit).map((cert: any, idx: number) => {
                  const originalCert = profile.certifications?.find((c: any) => c.id === cert.id) || {};
                  return (
                    <View key={idx} style={{ marginBottom: 10 }}>
                      <View style={styles.experienceHeader}>
                        <Text style={styles.company}>{cert.name || originalCert.name}</Text>
                        <Text style={styles.date}>{cert.year || originalCert.year}</Text>
                      </View>
                      <Text style={styles.text}>{cert.issuer || originalCert.issuer}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {tailoredCourses?.filter((c: any) => !c.omit).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Kursy' : 'Courses'}</Text>
                {tailoredCourses.filter((c: any) => !c.omit).map((course: any, idx: number) => {
                  const originalCourse = profile.courses?.find((c: any) => c.id === course.id) || {};
                  return (
                    <View key={idx} style={{ marginBottom: 10 }}>
                      <View style={styles.experienceHeader}>
                        <Text style={styles.company}>{course.title || originalCourse.title}</Text>
                        <Text style={styles.date}>{course.year || originalCourse.year}</Text>
                      </View>
                      <Text style={styles.text}>{course.provider || originalCourse.provider}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {displayLanguages?.filter((l: any) => l.name).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Języki' : 'Languages'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15 }}>
                  {displayLanguages.filter((l: any) => l.name).map((lang: any, idx: number) => (
                    <Text key={idx} style={styles.text}>
                      {lang.name} ({lang.level})
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>
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
