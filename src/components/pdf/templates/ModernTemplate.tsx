import React from 'react';
import { Page, Text, View, StyleSheet, Image, Document, Svg, Path, Link } from '@react-pdf/renderer';
import { getGenderedTitle } from '../../../lib/utils';

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
    fontFamily: 'Noto Sans',
    fontSize: 10,
    lineHeight: 1.5,
  },
  container: {
    flexDirection: 'row',
    height: '100%',
  },
  sidebar: {
    width: '30%',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    padding: 30,
    paddingTop: 40,
    height: '100%',
  },
  main: {
    width: '70%',
    padding: 40,
    paddingTop: 40,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#334155',
    objectFit: 'cover',
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 1.2,
  },
  jobTitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 25,
  },
  sidebarSection: {
    marginBottom: 20,
  },
  sidebarTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 8,
    color: '#cbd5e1',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 4,
    marginBottom: 12,
  },
  text: {
    fontSize: 9,
    color: '#334155',
    marginBottom: 4,
    lineHeight: 1.5,
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
    lineHeight: 1.5,
  },
  experienceItem: {
    marginBottom: 15,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  position: {
    fontSize: 10,
    fontWeight: 700,
    color: '#0f172a',
  },
  date: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: 600,
  },
  company: {
    fontSize: 9,
    color: '#1e3a8a',
    fontWeight: 600,
    marginBottom: 4,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 8,
    color: '#334155',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  },
});

export const ModernTemplate = ({ data, profile, jobInfo, appLanguage, showPhoto = true, showSkillLevels = true }: any) => {
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

            {personalInfo.socialLinks?.length > 0 && (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarTitle}>{appLanguage === 'pl' ? 'Social Media' : 'Socials'}</Text>
                {personalInfo.socialLinks.map((link: any, idx: number) => (
                  <View key={idx} style={styles.contactItem}>
                    <LinkIcon />
                    <Text style={styles.contactText}>{link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Main Content: Everything else */}
          <View style={styles.main}>
            {tailoredBio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'O mnie' : 'Summary'}</Text>
                <Text style={styles.text}>{tailoredBio}</Text>
              </View>
            )}

            {tailoredExp?.filter((exp: any) => !exp.omit).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Doświadczenie' : 'Experience'}</Text>
                {tailoredExp.filter((exp: any) => !exp.omit).map((exp: any, idx: number) => {
                  const originalExp = profile.experience?.find((e: any) => e.id === exp.id) || profile.experience?.find((e: any) => e.company === exp.company) || {};
                  return (
                    <View key={idx} style={styles.experienceItem}>
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
                <View style={styles.skillsGrid}>
                  {tailoredSkills.map((s: string | any, i: number) => {
                    const skillName = typeof s === 'string' ? s : s.name;
                    const originalSkill = profile.skills?.find((ps: any) => ps.name.toLowerCase() === skillName.toLowerCase());
                    const level = originalSkill?.level;
                    return (
                      <View key={i} style={styles.skillBadge}>
                        <Text style={{ fontSize: 8 }}>
                          {skillName}{showSkillLevels && level ? ` - ${level}` : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {profile.education?.filter((e: any) => e.school || e.degree).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{appLanguage === 'pl' ? 'Wykształcenie' : 'Education'}</Text>
                {profile.education.filter((e: any) => e.school || e.degree).map((edu: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <View style={styles.experienceHeader}>
                      <Text style={styles.position}>{edu.school}</Text>
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
                    <View key={idx} style={styles.experienceItem}>
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
                    <View key={idx} style={{ marginBottom: 6 }}>
                      <View style={styles.experienceHeader}>
                        <Text style={styles.position}>{cert.name || originalCert.name}</Text>
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
                    <View key={idx} style={{ marginBottom: 6 }}>
                      <View style={styles.experienceHeader}>
                        <Text style={styles.position}>{course.title || originalCourse.title}</Text>
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
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
