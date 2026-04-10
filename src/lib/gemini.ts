import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

export const JobSchema = z.object({
  meta: z.object({
    language: z.string().optional(),
    is_real_job_offer: z.boolean().optional().default(true)
  }).optional().default({ is_real_job_offer: true }),
  basic_info: z.object({
    job_title: z.string().nullable().optional(),
    company_name: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    employment_type: z.string().nullable().optional()
  }).optional(),
  skills: z.object({
    must_have: z.array(z.string()).optional().default([]),
    nice_to_have: z.array(z.string()).optional().default([])
  }).optional(),
  context: z.object({
    main_responsibilities: z.array(z.string()).optional().default([])
  }).optional(),
  company: z.object({
    description: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    culture: z.string().nullable().optional(),
    benefits: z.array(z.string()).optional().default([])
  }).optional()
});

const systemInstruction = `You are an elite, highly precise Data Extraction Algorithm specializing in HR and Recruitment. Your ONLY task is to deeply analyze the provided Job Offer URL or text and extract explicitly stated facts with maximum precision.

🚨 ANTI-HALLUCINATION PROTOCOL - READ CAREFULLY: 🚨
DO NOT INFER OR GUESS. If a piece of information (e.g., salary, specific skill, company culture) is NOT explicitly written in the main body of the job description, you MUST return null or an empty array []. Do not make assumptions based on the job title.
IGNORE NOISE. Job boards contain noise. You MUST IGNORE:
"Similar Jobs" / "Inne oferty"
"People also searched for"
Footer menus, cookie policies, or navigation bars.
EXACT MATCHING. When listing Hard Skills, extract the exact tools/technologies mentioned (e.g., if it says "Excel", write "Excel", do not invent "Microsoft Office Suite").

CRITICAL: You MUST extract the \`job_title\` and \`company_name\`. Look carefully at the very beginning of the text, headers, metadata, or the "About the company" section. If it's a job board, the company name is usually prominently displayed next to or below the job title. If the company name is hidden (e.g., "Confidential Client"), output "Confidential".

MAPPING INSTRUCTIONS (Strictly separate these sections):
1. RESPONSIBILITIES ("Twój zakres obowiązków", "Będziesz odpowiadać za", "What you will do"): Map strictly to \`context.main_responsibilities\`. Extract EVERY single responsibility listed. Be detailed.
2. MUST-HAVE REQUIREMENTS ("Nasze wymagania", "Oczekujemy", "Wymagania pracodawcy", "Requirements"): Map strictly to \`skills.must_have\`. Extract EVERY single requirement, including soft skills, hard skills, languages, and experience levels. Do not summarize too much, keep the original precision.
3. NICE-TO-HAVE ("Mile widziane", "Dodatkowym atutem będzie", "Nice to have"): Map strictly to \`skills.nice_to_have\`.
4. COMPANY INFO ("O nas", "Kim jesteśmy", "O firmie", "Oferujemy", "About us"): Meticulously extract company details into the \`company\` object.

FEW-SHOT EXAMPLE:
Input: "Firma TechCorp poszukuje Senior Frontend Developera do pracy zdalnej (B2B). Wymagamy: React, TypeScript, min. 3 lata doświadczenia, język angielski B2. Mile widziane: Node.js, AWS. Będziesz odpowiadać za: tworzenie nowych funkcjonalności, code review. Oferujemy: Multisport, prywatna opieka medyczna."
Output: {
  "meta": { "language": "pl", "is_real_job_offer": true },
  "basic_info": { "job_title": "Senior Frontend Developer", "company_name": "TechCorp", "location": "Remote", "employment_type": "B2B" },
  "skills": { "must_have": ["React", "TypeScript", "min. 3 lata doświadczenia", "język angielski B2"], "nice_to_have": ["Node.js", "AWS"] },
  "context": { "main_responsibilities": ["tworzenie nowych funkcjonalności", "code review"] },
  "company": { "description": null, "industry": null, "culture": null, "benefits": ["Multisport", "prywatna opieka medyczna"] }
}`;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    meta: {
      type: Type.OBJECT,
      properties: {
        language: { type: Type.STRING, description: "ISO code of the job ad (e.g., 'pl', 'en')" },
        is_real_job_offer: { type: Type.BOOLEAN, description: "false if the page is just a captcha, login page, or error 404" }
      }
    },
    basic_info: {
      type: Type.OBJECT,
      properties: {
        job_title: { type: Type.STRING, description: "The exact job title. Look for the most prominent heading or title.", nullable: true },
        company_name: { type: Type.STRING, description: "The exact company name. Look for it near the job title or in the 'About us' section.", nullable: true },
        location: { type: Type.STRING, description: "Exact location or 'Remote'", nullable: true },
        employment_type: { type: Type.STRING, description: "Extract ONLY if explicitly stated (e.g., B2B, UoP). Else null.", nullable: true }
      }
    },
    skills: {
      type: Type.OBJECT,
      properties: {
        must_have: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Extract ONLY explicitly listed mandatory requirements/tools" },
        nice_to_have: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Extract ONLY explicitly listed optional/bonus skills" }
      }
    },
    context: {
      type: Type.OBJECT,
      properties: {
        main_responsibilities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List core duties explicitly written in the text" }
      }
    },
    company: {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING, description: "Detailed description of the company, what they do, their product/service.", nullable: true },
        industry: { type: Type.STRING, description: "The industry the company operates in.", nullable: true },
        culture: { type: Type.STRING, description: "Company culture, values, or work environment explicitly mentioned.", nullable: true },
        benefits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of benefits offered (e.g., Multisport, private healthcare)." }
      }
    }
  }
};

export const fetchJobFromURL = async (apiKey: string, url: string) => {
  const ai = new GoogleGenAI({ apiKey });
  
  // Pillar 1: Smart Scraping Pipeline (Jina Reader API Fallback)
  let jobText = "";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    const jinaResponse = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (jinaResponse.ok) {
      jobText = await jinaResponse.text();
    }
  } catch (err) {
    console.warn("Jina Reader failed, falling back to Gemini Grounding", err);
  }

  let response;
  
  if (jobText && jobText.length > 100) {
    // We have text from Jina, use it directly without googleSearch to save time/tokens
    response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Przeanalizuj treść ogłoszenia o pracę:\n\n${jobText}`,
      config: {
        temperature: 0.1,
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });
  } else {
    // Fallback to Google Grounding
    response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Przeanalizuj treść ogłoszenia o pracę pod tym adresem: ${url}`,
      config: {
        temperature: 0.1,
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema
      }
    });
  }

  let responseText = response.text;
  
  if (!responseText) {
    return { meta: { is_real_job_offer: false } };
  }

  try {
    const parsed = JSON.parse(responseText);
    // Pillar 3: Reliable Validation (Zod Integration)
    return JobSchema.parse(parsed);
  } catch (e) {
    // If the model returns markdown wrapped JSON, try to clean it
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const parsed = JSON.parse(responseText);
      return JobSchema.parse(parsed);
    } catch (e2) {
      console.error("Zod validation or JSON parsing failed:", e2);
      return { meta: { is_real_job_offer: false } };
    }
  }
};

export const analyzeJobDescription = async (apiKey: string, text: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Analyze this job description and extract key information in JSON format: ${text}`,
    config: {
      temperature: 0.1,
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema
    }
  });

  let responseText = response.text;
  
  if (!responseText) {
    return { meta: { is_real_job_offer: false } };
  }

  try {
    const parsed = JSON.parse(responseText);
    return JobSchema.parse(parsed);
  } catch (e) {
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const parsed = JSON.parse(responseText);
      return JobSchema.parse(parsed);
    } catch (e2) {
      console.error("Zod validation or JSON parsing failed:", e2);
      return { meta: { is_real_job_offer: false } };
    }
  }
};

export const enhanceText = async (apiKey: string, text: string, context: string = "") => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Analyze the following text provided by a user for their CV/Resume.
    
    TEXT: "${text}"
    CONTEXT: "${context}"
    
    INSTRUCTIONS:
    1. VALIDATION: Check if the text makes sense and contains enough context to be improved. If it's gibberish (e.g., "asdsa", "test"), a single word without context, or too short to understand the meaning, set 'isValid' to false.
    2. IMPROVEMENT: If the text is valid, rewrite it to sound more professional and impactful using the STAR (Situation, Task, Action, Result) or Google XYZ method.
       - DETECT THE LANGUAGE of the input text and return the improved version and reasoning in the SAME LANGUAGE.
       - If the text describes responsibilities, achievements, or a list of items, use a bulleted list (starting with "• ").
       - Keep it concise and action-oriented.
    3. REASONING: Briefly explain what you changed and why (e.g., "Dodałem profesjonalne słownictwo i podkreśliłem jakość Twojej pracy.").
    
    Return the result strictly in JSON format.
  `;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN, description: "True if the text makes sense and can be improved, false otherwise." },
          improvedText: { type: Type.STRING, description: "The improved text. Empty if isValid is false." },
          reasoning: { type: Type.STRING, description: "Explanation of the changes made. Empty if isValid is false." }
        },
        required: ["isValid", "improvedText", "reasoning"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const auditProfile = async (apiKey: string, profile: any) => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Analyze the following candidate profile and provide real-time tips for improvement.
    Act as a senior recruiter. Provide a list of 3-5 actionable tips.
    
    PROFILE:
    ${JSON.stringify(profile)}
    
    INSTRUCTIONS:
    - DETECT THE LANGUAGE used in the profile and provide all tips and messages in the SAME LANGUAGE.
    
    Return the result in JSON format.
  `;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Profile strength score 0-100" },
          tips: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["critical", "warning", "tip"] },
                message: { type: Type.STRING },
                section: { type: Type.STRING }
              }
            }
          }
        },
        required: ["score", "tips"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const suggestSkills = async (apiKey: string, profile: any) => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Based on the following candidate profile (experience, education, projects), suggest 10 relevant skills they might have but haven't listed.
    Categorize them into 'hard', 'soft', or 'tool'.
    
    PROFILE:
    ${JSON.stringify(profile)}
    
    INSTRUCTIONS:
    - DETECT THE LANGUAGE used in the profile and provide all suggestions and descriptions in the SAME LANGUAGE.
    
    Return the result in JSON format.
  `;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING, enum: ["hard", "soft", "tool"] },
                description: { type: Type.STRING, description: "Briefly explain why this skill is relevant" }
              },
              required: ["name", "category", "description"]
            }
          }
        },
        required: ["suggestions"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const tailorCv = async (apiKey: string, profile: any, jobInfo: any, targetLanguage: string = "auto") => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    You are an expert career coach and CV writer specializing in ATS optimization and semantic mirroring.
    Your task is to tailor a candidate's CV for a specific job offer.
    
    CRITICAL INSTRUCTIONS:
    1. ACTIVE SELECTION: You MUST only include experiences, skills, and projects that are relevant to the job. If an item is not relevant, set its "omit" property to true.
    2. PRIORITIZATION: Reorder experiences, projects, courses, and certificates so the most relevant ones appear first based on 'relevanceScore'.
    3. SEMANTIC MIRRORING: Use keywords and terminology from the job description in the tailored descriptions.
    4. GENDER ADAPTATION: The candidate's gender is "${profile.personalInfo.gender || 'not specified'}". 
       - If the language is Polish, adjust job titles to match the gender (e.g., "Programista" -> "Programistka", "Kierownik" -> "Kierowniczka").
       - Use the provided gender to ensure all job titles in the CV are appropriate.
    5. PROFESSIONAL SUMMARY: Write a compelling 3-4 sentence summary that directly connects the candidate's top strengths to the job's specific needs. Use strictly the FIRST PERSON.
    6. SMART SORTING & WEIGHTING: 
       - Assign a 'relevanceScore' (0-100) to each item.
       - For highly relevant experiences, generate a detailed description with many bullet points.
       - For less relevant experiences, condense the description to just 1-2 short lines.
    7. Use Action Verbs: replace passive words with active ones.
    8. Use the target language: ${targetLanguage === 'auto' ? 'the same as the job description' : targetLanguage}.
    9. COVER LETTER: Write a highly personalized 3-paragraph cover letter (max 300 words). DO NOT include greetings or sign-offs. Generate ONLY the body paragraphs.
    10. SKILLS CLEAN-UP: Select a maximum of 15 most relevant skills. Prioritize hard skills.
    11. Generate a Match Analysis including score (0-100), hard skills gaps, experience gaps, recommendations, and strengths.
    12. Strengths (Mocne strony): Write 3-5 full, confidence-building sentences.
    13. Weaknesses (Obszary do poprawy): 2-3 missing requirements.
    14. Interview Tips (Strategia na rozmowę): 2 tailored tips.
    15. REAL GAP ANALYSIS: Provide specific, actionable gaps with priority. Ignore soft corporate jargon.
    16. Recommendations: Provide actionable recommendations with priority.
    17. CRITICAL: Update \`personalInfo.jobTitle\` to match the job title from the job ad, adapted to the candidate's gender.
    
    JOB INFO:
    ${JSON.stringify(jobInfo)}
    
    CANDIDATE PROFILE:
    ${JSON.stringify(profile)}
    
    Return the result in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tailoredSummary: { type: Type.STRING },
          sectionOrder: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "The optimal order of sections for this job (e.g., ['experience', 'certificates', 'education', 'courses', 'projects'])"
          },
          tailoredExperience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                company: { type: Type.STRING },
                position: { type: Type.STRING },
                description: { type: Type.STRING, description: "Tailored bullet points using action verbs and semantic mirroring" },
                modifiedByAI: { type: Type.BOOLEAN, description: "Set to true if you significantly modified or added this point to boost the match score" },
                aiExplanation: { type: Type.STRING, description: "If modifiedByAI is true, explain briefly WHY you changed it (e.g., 'Changed X to Y to match the job requirement Z')." },
                relevanceScore: { type: Type.NUMBER, description: "0-100 score based on relevance to the job" },
                omit: { type: Type.BOOLEAN, description: "True if the experience is completely irrelevant and should be hidden" }
              }
            }
          },
          tailoredCourses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                provider: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING },
                relevanceScore: { type: Type.NUMBER },
                omit: { type: Type.BOOLEAN }
              }
            }
          },
          tailoredCertificates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                issuer: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                description: { type: Type.STRING },
                url: { type: Type.STRING },
                relevanceScore: { type: Type.NUMBER },
                omit: { type: Type.BOOLEAN }
              }
            }
          },
          tailoredProjects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                link: { type: Type.STRING },
                relevanceScore: { type: Type.NUMBER },
                omit: { type: Type.BOOLEAN }
              }
            }
          },
          tailoredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          coverLetter: { type: Type.STRING },
          personalInfo: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              jobTitle: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              location: { type: Type.STRING }
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                school: { type: Type.STRING },
                degree: { type: Type.STRING },
                field: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING }
              }
            }
          },
          languages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                level: { type: Type.STRING }
              }
            }
          },
          matchAnalysis: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              hardSkillsGaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING, description: "The missing hard skill or tool" },
                    reason: { type: Type.STRING, description: "Explanation of why it's a gap based on the job description vs profile" },
                    priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "Priority of this gap" }
                  },
                  required: ["skill", "reason", "priority"]
                }
              },
              experienceGaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING, description: "The missing experience type or scale" },
                    reason: { type: Type.STRING, description: "Explanation of why the scale or type of experience is a gap" },
                    priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "Priority of this gap" }
                  },
                  required: ["skill", "reason", "priority"]
                }
              },
              recommendations: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["high", "medium", "low"] }
                  },
                  required: ["text", "priority"]
                } 
              },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 full, confidence-building sentences explaining why the candidate is a great fit." },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              interviewTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        },
        required: ["tailoredSummary", "tailoredExperience", "tailoredSkills", "coverLetter", "matchAnalysis"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const translateTailoredData = async (apiKey: string, data: any, targetLanguage: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    Translate the following tailored CV data into ${targetLanguage}.
    Keep the structure exactly the same.
    
    DATA:
    ${JSON.stringify(data)}
    
    Return the result in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tailoredSummary: { type: Type.STRING },
          tailoredExperience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                company: { type: Type.STRING },
                position: { type: Type.STRING },
                description: { type: Type.STRING },
                modifiedByAI: { type: Type.BOOLEAN },
                aiExplanation: { type: Type.STRING },
                relevanceScore: { type: Type.NUMBER },
                omit: { type: Type.BOOLEAN }
              }
            }
          },
          tailoredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          coverLetter: { type: Type.STRING },
          personalInfo: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              jobTitle: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              location: { type: Type.STRING }
            }
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                school: { type: Type.STRING },
                degree: { type: Type.STRING },
                field: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING }
              }
            }
          },
          languages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                level: { type: Type.STRING }
              }
            }
          },
          matchAnalysis: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              hardSkillsGaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING, description: "The missing hard skill or tool" },
                    reason: { type: Type.STRING, description: "Explanation of why it's a gap based on the job description vs profile" },
                    priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "Priority of this gap" }
                  },
                  required: ["skill", "reason", "priority"]
                }
              },
              experienceGaps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    skill: { type: Type.STRING, description: "The missing experience type or scale" },
                    reason: { type: Type.STRING, description: "Explanation of why the scale or type of experience is a gap" },
                    priority: { type: Type.STRING, enum: ["high", "medium", "low"], description: "Priority of this gap" }
                  },
                  required: ["skill", "reason", "priority"]
                }
              },
              recommendations: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ["high", "medium", "low"] }
                  },
                  required: ["text", "priority"]
                } 
              },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 full, confidence-building sentences explaining why the candidate is a great fit." },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              interviewTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        },
        required: ["tailoredSummary", "tailoredExperience", "tailoredSkills", "coverLetter"]
      }
    }
  });
  return JSON.parse(response.text);
};

export const fixGapInCv = async (apiKey: string, tailoredData: any, skill: string, jobInfo: any, userInput?: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `
    You are an expert CV copywriter and ATS optimization specialist.
    I need to address a gap in my CV regarding "${skill}" for the following job:
    ${JSON.stringify(jobInfo)}
    
    ${userInput ? `The user provided this specific context/experience to fill the gap: "${userInput}"` : `I have added this skill to my profile.`}
    
    Your task is to perform "Contextual Text Engineering" (AI Weaving).
    DO NOT just add a new bullet point saying "I know ${skill}".
    INSTEAD, find the most relevant existing experience, education, or summary point and rewrite it to naturally incorporate this skill.
    For example, change "Warehouse helper" to "Comprehensive warehouse operations, including the use of hand scanners (WMS) to optimize dispatch."
    
    Only modify the entries/sections where it makes sense to add this. Be specific and concrete.
    For experience entries, set the "modifiedByAI" flag to true if you modify them.
    
    CURRENT CV DATA:
    ${JSON.stringify({
      tailoredSummary: tailoredData.tailoredSummary,
      tailoredExperience: tailoredData.tailoredExperience,
      tailoredSkills: tailoredData.tailoredSkills,
      education: tailoredData.education,
      projects: tailoredData.projects
    })}
    
    Return the updated CV sections in JSON format. If a section was not modified, return it exactly as it was.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tailoredSummary: { type: Type.STRING },
          tailoredExperience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                company: { type: Type.STRING },
                position: { type: Type.STRING },
                description: { type: Type.STRING },
                modifiedByAI: { type: Type.BOOLEAN },
                aiExplanation: { type: Type.STRING },
                relevanceScore: { type: Type.NUMBER },
                omit: { type: Type.BOOLEAN }
              }
            }
          },
          tailoredSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                school: { type: Type.STRING },
                degree: { type: Type.STRING },
                field: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text);
};
