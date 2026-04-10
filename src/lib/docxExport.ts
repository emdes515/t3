import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export const generateWordDocument = async (data: any, profile: any, jobInfo: any, type: 'cv' | 'coverLetter') => {
  if (type === 'coverLetter') {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: profile?.personalInfo?.fullName || '', bold: true, size: 32 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `${profile?.personalInfo?.email || ''} | ${profile?.personalInfo?.phone || ''}`, size: 24 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          ...data?.coverLetter?.split('\n').map((paragraph: string) => 
            new Paragraph({
              children: [new TextRun({ text: paragraph, size: 24 })],
              spacing: { after: 200 },
            })
          ) || []
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `CoverLetter_${jobInfo?.basic_info?.company_name || jobInfo?.company || 'Company'}_${profile?.personalInfo?.fullName || 'Name'}.docx`);
    return;
  }

  // CV Generation
  const children: any[] = [
    new Paragraph({
      children: [
        new TextRun({ text: profile?.personalInfo?.fullName || '', bold: true, size: 36 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${profile?.personalInfo?.email || ''} | ${profile?.personalInfo?.phone || ''}`, size: 24 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  if (data?.tailoredSummary) {
    children.push(
      new Paragraph({
        text: "SUMMARY",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: data.tailoredSummary, size: 24 })],
        spacing: { after: 300 },
      })
    );
  }

  if (data?.tailoredExperience?.filter((exp: any) => !exp.omit).length > 0) {
    children.push(
      new Paragraph({
        text: "EXPERIENCE",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    data.tailoredExperience.filter((exp: any) => !exp.omit).forEach((exp: any) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.role, bold: true, size: 28 }),
            new TextRun({ text: ` at ${exp.company}`, size: 28 }),
          ],
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.startDate} - ${exp.endDate}`, italics: true, size: 24 }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: exp.description, size: 24 })],
          spacing: { after: 200 },
        })
      );
    });
  }

  if (data?.education?.length > 0) {
    children.push(
      new Paragraph({
        text: "EDUCATION",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    data.education.forEach((edu: any) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.degree, bold: true, size: 28 }),
            new TextRun({ text: ` at ${edu.institution}`, size: 28 }),
          ],
          spacing: { before: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `${edu.startDate} - ${edu.endDate}`, italics: true, size: 24 }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  }

  if (data?.skills?.length > 0) {
    children.push(
      new Paragraph({
        text: "SKILLS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: data.skills.join(', '), size: 24 })],
        spacing: { after: 300 },
      })
    );
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `CV_${jobInfo?.basic_info?.company_name || jobInfo?.company || 'Company'}_${profile?.personalInfo?.fullName || 'Name'}.docx`);
};
