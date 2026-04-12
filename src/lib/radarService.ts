import { GoogleGenAI, Type } from "@google/genai";
import { analyzeJobDescription } from './gemini';
import type { UserProfile, RadarJob } from '../store/useStore';

/**
 * AI Job Radar — Scanning Engine
 * 
 * Pipeline:
 * 1. generateSearchQueries() — AI Dorking based on Master Profile
 * 2. searchJobsWithGemini() — Gemini Search Grounding to find URLs
 * 3. preScreenJob() — Scrape + Analyze + Match Score per job
 * 4. quickMatchScore() — Lightweight profile-vs-job comparison
 */

// ─── Step 1: AI Dorking ───────────────────────────────────────────────────

export const generateSearchQueries = async (
  apiKey: string,
  profile: UserProfile,
  searchSettings: any
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey });

  const profileSummary = {
    jobTitle: profile.personalInfo.jobTitle || '',
    location: profile.personalInfo.location || '',
    skills: profile.skills.map(s => s.name).slice(0, 15),
    latestPosition: profile.experience[0]?.position || '',
    latestCompany: profile.experience[0]?.company || '',
    certifications: profile.certifications.map(c => c.name).slice(0, 5),
  };

  const prompt = `
    You are an expert job search strategist. Based on the candidate profile below, generate 3-5 Google search queries (Google Dorks) that will find the most relevant, RECENT (last 7 days) job postings on Polish and international job boards.

    CANDIDATE PROFILE (Baseline):
    - Original Job Title: "${profileSummary.jobTitle}"
    - Original Location: "${profileSummary.location}"
    - Key Skills: ${profileSummary.skills.join(', ')}
    - Latest Position: "${profileSummary.latestPosition}" at "${profileSummary.latestCompany}"
    - Certifications: ${profileSummary.certifications.join(', ')}

    USER SEARCH TARGET (Prioritize this!):
    - Target Job Title: ${searchSettings.jobTitle ? `"${searchSettings.jobTitle}"` : 'Use baseline Original Job Title'}
    - Target Location: ${searchSettings.location ? `"${searchSettings.location}"` : 'Use baseline location or ANY'}
    - Work Model: ${searchSettings.workModel !== 'any' ? `"${searchSettings.workModel}" (e.g. Remote, Hybrid)` : 'Any model'}

    RULES:
    1. Target these sites: pracuj.pl, linkedin.com/jobs, justjoin.it, indeed.com, nofluffjobs.com, olx.pl/praca
    2. Use site: operators, intitle:, and keyword combinations
    3. Include location-specific targeting if location is known
    4. Generate queries in the language matching the job title (Polish titles → Polish queries)
    5. Make queries specific enough to find relevant results but broad enough to get results
    6. DO NOT include date operators — the search API will handle recency

    Return as a JSON array of query strings.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          queries: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3-5 Google Dork search queries"
          }
        },
        required: ["queries"]
      }
    }
  });

  const parsed = JSON.parse(response.text || '{"queries":[]}');
  return parsed.queries || [];
};

// ─── Step 2: Search with Gemini Search Grounding ──────────────────────────

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

export const searchJobsWithGemini = async (
  apiKey: string,
  queries: string[]
): Promise<SearchResult[]> => {
  const ai = new GoogleGenAI({ apiKey });
  const allResults: SearchResult[] = [];

  for (const query of queries) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find recent job postings matching this search query. Return ONLY real job posting URLs from job boards (pracuj.pl, linkedin.com/jobs, justjoin.it, indeed.com, nofluffjobs.com, olx.pl/praca). Query: "${query}"`,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.0,
        }
      });

      // Extract URLs from grounding metadata
      const text = response.text || '';
      
      // Parse grounding chunks if available
      const candidates = (response as any).candidates || [];
      const groundingMetadata = candidates[0]?.groundingMetadata;
      
      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web?.uri) {
            const uri = chunk.web.uri;
            // Filter to only job board URLs
            if (isJobBoardUrl(uri) && !allResults.some(r => r.url === uri)) {
              allResults.push({
                url: uri,
                title: chunk.web.title || extractTitleFromUrl(uri),
                snippet: ''
              });
            }
          }
        }
      }

      // Also try to extract URLs from the text response
      const urlRegex = /https?:\/\/(?:www\.)?(?:pracuj\.pl|linkedin\.com\/jobs|justjoin\.it|indeed\.com|nofluffjobs\.com|olx\.pl\/praca)[^\s\)\"\'<>]*/gi;
      const textUrls = text.match(urlRegex) || [];
      for (const url of textUrls) {
        const cleanUrl = url.replace(/[.,;:!?\)]+$/, ''); // Clean trailing punctuation
        if (!allResults.some(r => r.url === cleanUrl)) {
          allResults.push({
            url: cleanUrl,
            title: extractTitleFromUrl(cleanUrl),
            snippet: ''
          });
        }
      }

    } catch (error) {
      console.warn(`Search failed for query "${query}":`, error);
      // Continue with other queries
    }
  }

  // Deduplicate and limit to 10
  return allResults.slice(0, 10);
};

// ─── Step 3: Analyze Single Match (On-Demand) ──────────────────────────────

export const analyzeSingleMatch = async (
  apiKey: string,
  job: RadarJob,
  profile: UserProfile,
  onProgress?: (message: string) => void
): Promise<Partial<RadarJob> | null> => {
  try {
    onProgress?.(`🧹 Pobieram treść z: ${job.url}...`);

    let jobText = '';
    try {
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: job.url }),
      });

      if (!scrapeResponse.ok) return null;
      const data = await scrapeResponse.json();
      jobText = data.text;
    } catch {
      return null;
    }

    if (!jobText || jobText.length < 100) return null;

    onProgress?.(`🧠 Analizuję wymagania...`);
    const jobInfo = await analyzeJobDescription(apiKey, jobText);

    if (!jobInfo || jobInfo.meta?.is_real_job_offer === false) return null;

    onProgress?.(`📊 Obliczam procent dopasowania...`);
    const matchResult = await quickMatchScore(apiKey, profile, jobInfo);

    return {
      title: jobInfo.basic_info?.job_title || job.title,
      company: jobInfo.basic_info?.company_name || job.company,
      location: jobInfo.basic_info?.location || job.location,
      matchScore: matchResult.score,
      aiSummary: matchResult.aiSummary,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      jobInfo,
      isAnalyzed: true
    };
  } catch (error) {
    console.warn(`Analysis failed for ${job.url}:`, error);
    return null;
  }
};

// ─── Step 4: Quick Match Score ────────────────────────────────────────────

interface MatchResult {
  score: number;
  aiSummary: string;
  matchedSkills: string[];
  missingSkills: string[];
}

export const quickMatchScore = async (
  apiKey: string,
  profile: UserProfile,
  jobInfo: any
): Promise<MatchResult> => {
  const ai = new GoogleGenAI({ apiKey });

  const profileSnapshot = {
    jobTitle: profile.personalInfo.jobTitle,
    skills: profile.skills.map(s => s.name),
    experience: profile.experience.map(e => ({
      position: e.position,
      company: e.company,
      description: e.description?.substring(0, 200)
    })),
    certifications: profile.certifications.map(c => c.name),
    languages: profile.languages.map(l => `${l.name} (${l.level})`),
  };

  const prompt = `
    You are an expert recruiter. Compare this candidate's profile to the job requirements and determine how well they match.

    JOB REQUIREMENTS:
    - Title: ${jobInfo.basic_info?.job_title || 'N/A'}
    - Must-Have Skills: ${(jobInfo.skills?.must_have || []).join(', ')}
    - Nice-to-Have: ${(jobInfo.skills?.nice_to_have || []).join(', ')}
    - Responsibilities: ${(jobInfo.context?.main_responsibilities || []).join(', ')}

    CANDIDATE PROFILE:
    ${JSON.stringify(profileSnapshot)}

    INSTRUCTIONS:
    1. Calculate a match score (0-100) based on skill overlap, experience relevance, and certification match
    2. Write a 1-2 sentence summary explaining WHY this job is a good (or bad) match — write it as advice to the candidate, in the SAME LANGUAGE as the job title
    3. List which candidate skills match the requirements
    4. List which required skills the candidate is missing

    Be realistic and precise. Don't inflate scores.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Match score 0-100" },
          aiSummary: { type: Type.STRING, description: "1-2 sentence explanation of the match" },
          matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Skills the candidate has that match" },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Required skills the candidate lacks" }
        },
        required: ["score", "aiSummary", "matchedSkills", "missingSkills"]
      }
    }
  });

  return JSON.parse(response.text || '{"score":0,"aiSummary":"","matchedSkills":[],"missingSkills":[]}');
};

// ─── Full Scan Pipeline ───────────────────────────────────────────────────

export const runFullRadarScan = async (
  apiKey: string,
  profile: UserProfile,
  minMatchScore: number,
  searchSettings: any,
  onProgress: (current: number, total: number, message: string) => void,
  onJobFound: (job: RadarJob) => void
): Promise<void> => {
  // Step 1: Generate search queries
  onProgress(0, 0, '🧠 Generuję zapytania wyszukiwarki na podstawie Twojego profilu i preferencji...');
  const queries = await generateSearchQueries(apiKey, profile, searchSettings);
  
  if (queries.length === 0) {
    throw new Error('Nie udało się wygenerować zapytań. Upewnij się, że masz wypełniony profil (tytuł stanowiska, umiejętności).');
  }

  // Step 2: Search the web
  onProgress(0, 0, `🔍 Przeszukuję portale pracy (${queries.length} zapytań)...`);
  const searchResults = await searchJobsWithGemini(apiKey, queries);

  if (searchResults.length === 0) {
    throw new Error('Nie znalazłem żadnych ofert. Spróbuj zaktualizować swój profil lub sprawdź za jakiś czas.');
  }

  // Step 3: Fast-Track Yield
  const total = searchResults.length;
  let current = 0;

  for (const result of searchResults) {
    current++;
    onProgress(current, total, `🗂️ Znaleziono nową ofertę: ${result.title.substring(0, 30)}...`);

    const radarJob: RadarJob = {
      id: `radar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: result.url,
      title: result.title || 'Oferta Pracy',
      company: extractCompanyFromTitle(result.title),
      foundAt: new Date().toISOString(),
      status: 'new',
      isAnalyzed: false
    };

    onJobFound(radarJob);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function isJobBoardUrl(url: string): boolean {
  const jobBoards = [
    'pracuj.pl',
    'linkedin.com/jobs',
    'justjoin.it',
    'indeed.com',
    'indeed.pl',
    'nofluffjobs.com',
    'olx.pl/praca',
    'bulldogjob.pl',
    'gowork.pl',
  ];
  return jobBoards.some(board => url.includes(board));
}

function extractTitleFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1] || '';
    return lastPart
      .replace(/-/g, ' ')
      .replace(/,/g, ' ')
      .replace(/\d+/g, '')
      .trim()
      .substring(0, 80) || 'Job Posting';
  } catch {
    return 'Job Posting';
  }
}

function extractCompanyFromTitle(title: string): string {
  if (!title) return 'Nieznana Firma';
  const splitters = [' at ', ' | ', ' - ', ' w firmie '];
  for (const s of splitters) {
    if (title.includes(s)) {
      const parts = title.split(s);
      return parts[parts.length - 1].trim();
    }
  }
  return 'Nieznana Firma';
}
