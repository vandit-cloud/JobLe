import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";

const COMMON_SKILLS = [
  "React",
  "Next.js",
  "Angular",
  "Vue",
  "JavaScript",
  "TypeScript",
  "Node.js",
  "Express",
  "NestJS",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Bootstrap",
  "Redux",
  "GraphQL",
  "REST API",
  "MongoDB",
  "MySQL",
  "PostgreSQL",
  "SQL",
  "Python",
  "Django",
  "Flask",
  "FastAPI",
  "Java",
  "Spring Boot",
  "C",
  "C++",
  "C#",
  ".NET",
  "PHP",
  "Laravel",
  "Ruby on Rails",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Git",
  "GitHub",
  "GitLab",
  "Jenkins",
  "CI/CD",
  "Terraform",
  "Linux",
  "Figma",
  "Photoshop",
  "Canva",
  "Excel",
  "Power BI",
  "Tableau",
  "Data Analysis",
  "Machine Learning",
  "Deep Learning",
  "NLP",
  "Prompt Engineering",
  "Communication",
  "Leadership",
  "Problem Solving",
  "Project Management",
  "Agile",
  "Scrum",
  "Testing",
  "Jest",
  "Cypress",
  "Playwright",
];

const SKILL_GROUP_KEYWORDS = {
  programmingLanguages: ["JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#", "PHP", "SQL", "Ruby"],
  frameworks: ["React", "Next.js", "Angular", "Vue", "Express", "NestJS", "Django", "Flask", "FastAPI", "Spring Boot", "Laravel", "Ruby on Rails"],
  libraries: ["Redux", "GraphQL", "Jest", "Cypress", "Playwright", "Tailwind CSS", "Bootstrap"],
  databases: ["MongoDB", "MySQL", "PostgreSQL", "SQL"],
  cloudPlatforms: ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform"],
  developmentTools: ["Git", "GitHub", "GitLab", "Jenkins", "CI/CD", "Linux", "Figma", "Photoshop", "Canva", "Excel", "Power BI", "Tableau"],
  softSkills: ["Communication", "Leadership", "Problem Solving", "Project Management", "Agile", "Scrum"],
  domainSkills: ["REST API", "Machine Learning", "Deep Learning", "NLP", "Prompt Engineering", "Data Analysis", "Testing"],
};

const SECTION_TITLES = {
  summary: ["summary", "professional summary", "profile", "objective", "about me", "career objective"],
  skills: ["skills", "technical skills", "core skills", "competencies", "expertise"],
  education: ["education", "academic background", "academics", "qualifications"],
  experience: ["experience", "work experience", "professional experience", "employment history", "internships"],
  projects: ["projects", "personal projects", "academic projects", "key projects"],
  certifications: ["certifications", "certificates", "licenses"],
  languages: ["languages", "language proficiency"],
  awards: ["awards", "honors", "achievements"],
  publications: ["publications", "research", "papers"],
  volunteer: ["volunteer", "volunteer experience", "community work"],
};

const LIST_SEPARATOR_REGEX = /[|,;/\u2022\u00B7]/;
const OCR_CACHE_DIR = path.resolve(process.cwd(), "backend", "storage", "ocr-cache");
const MIN_DIRECT_TEXT_LENGTH = 120;
const MAX_OCR_PAGES = 3;
const MAX_EXTRACTED_TEXT_LENGTH = 100000;

async function extractTextFromPdfWithOcr(buffer) {
  const parser = new PDFParse({ data: buffer });
  const { createWorker } = Tesseract;

  try {
    const screenshots = await parser.getScreenshot({
      first: MAX_OCR_PAGES,
      desiredWidth: 1600,
      imageBuffer: true,
      imageDataUrl: false,
    });

    if (!screenshots?.pages?.length) {
      return "";
    }

    await fs.mkdir(OCR_CACHE_DIR, { recursive: true });
    const worker = await createWorker("eng", 1, {
      cachePath: OCR_CACHE_DIR,
      logger: () => {},
    });

    try {
      const pageTexts = [];
      for (const page of screenshots.pages) {
        if (!page?.data) {
          continue;
        }
        const result = await worker.recognize(page.data);
        pageTexts.push(result?.data?.text || "");
      }
      return normalizeWhitespace(pageTexts.join("\n\n"));
    } finally {
      await worker.terminate();
    }
  } catch (_error) {
    return "";
  } finally {
    await parser.destroy();
  }
}

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .normalize("NFKC")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

function normalizeList(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function titleCase(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function looksLikeSectionHeading(line) {
  const normalized = line.toLowerCase().replace(/[:\-]/g, "").trim();
  return Object.values(SECTION_TITLES).some((aliases) => aliases.some((alias) => normalized === alias || normalized.startsWith(`${alias} `)));
}

function detectSectionKey(line) {
  const normalized = line.toLowerCase().replace(/[:\-]/g, "").trim();
  for (const [key, aliases] of Object.entries(SECTION_TITLES)) {
    if (aliases.some((alias) => normalized === alias || normalized.startsWith(`${alias} `))) {
      return key;
    }
  }
  return null;
}

function buildSections(rawText) {
  const sections = Object.fromEntries(Object.keys(SECTION_TITLES).map((key) => [key, []]));
  const lines = normalizeWhitespace(rawText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let currentKey = null;
  for (const line of lines) {
    const detected = detectSectionKey(line);
    if (detected) {
      currentKey = detected;
      continue;
    }
    if (currentKey) {
      sections[currentKey].push(line);
    }
  }

  return sections;
}

function extractEmail(text) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractPhone(text) {
  const match = text.match(/(\+?\d[\d\s\-()]{7,}\d)/);
  return match ? match[1].replace(/\s{2,}/g, " ").trim() : "";
}

function extractLinks(text) {
  const urls = normalizeList(text.match(/https?:\/\/[^\s)]+/gi) || []);
  const socialLinks = {
    linkedin: "",
    github: "",
    portfolio: "",
    website: "",
    other: [],
  };

  for (const url of urls) {
    const lower = url.toLowerCase();
    if (!socialLinks.linkedin && lower.includes("linkedin.com")) {
      socialLinks.linkedin = url;
    } else if (!socialLinks.github && lower.includes("github.com")) {
      socialLinks.github = url;
    } else if (!socialLinks.portfolio && /(behance|dribbble|portfolio|vercel|netlify)/i.test(lower)) {
      socialLinks.portfolio = url;
    } else if (!socialLinks.website) {
      socialLinks.website = url;
    } else {
      socialLinks.other.push(url);
    }
  }

  socialLinks.other = normalizeList(socialLinks.other);
  return socialLinks;
}

function inferNameAndTitle(rawText, email) {
  const lines = normalizeWhitespace(rawText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  let name = "";
  let professionalTitle = "";

  for (const line of lines) {
    if (line.length > 80 || /\d/.test(line) || /@|https?:\/\//i.test(line)) {
      continue;
    }
    const words = line.split(/\s+/);
    if (!name && words.length >= 2 && words.length <= 5 && !looksLikeSectionHeading(line)) {
      name = titleCase(line);
      continue;
    }
    if (name && !professionalTitle && words.length >= 2 && line.toLowerCase() !== email.toLowerCase()) {
      professionalTitle = line;
      break;
    }
  }

  return { name, professionalTitle };
}

function inferSummary(sectionLines) {
  if (!sectionLines.length) {
    return "";
  }
  return sectionLines.join(" ").slice(0, 900).trim();
}

function categorizeSkills(skills = []) {
  const groups = Object.fromEntries(Object.keys(SKILL_GROUP_KEYWORDS).map((key) => [key, []]));

  for (const skill of normalizeList(skills)) {
    for (const [groupKey, candidates] of Object.entries(SKILL_GROUP_KEYWORDS)) {
      if (candidates.some((candidate) => candidate.toLowerCase() === skill.toLowerCase())) {
        groups[groupKey].push(skill);
      }
    }
  }

  for (const key of Object.keys(groups)) {
    groups[key] = normalizeList(groups[key]);
  }

  return groups;
}

function inferCareerLevel(totalExperienceYears) {
  if (totalExperienceYears >= 10) return "Senior";
  if (totalExperienceYears >= 5) return "Mid-level";
  if (totalExperienceYears >= 2) return "Junior";
  if (totalExperienceYears > 0) return "Entry-level";
  return "";
}

function inferSkills(rawText, skillSectionLines = [], requiredSkills = []) {
  const explicitSkills = skillSectionLines
    .flatMap((line) => line.split(LIST_SEPARATOR_REGEX))
    .map((value) => value.trim())
    .filter((value) => value.length > 1 && value.length < 40);

  const normalizedText = ` ${rawText.toLowerCase()} `;
  const keywordMatches = COMMON_SKILLS.filter((skill) => {
    const pattern = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\W)${pattern}(\\W|$)`, "i").test(normalizedText);
  });

  return normalizeList([...explicitSkills, ...keywordMatches, ...requiredSkills]).slice(0, 50);
}

function inferEducation(sectionLines = []) {
  return sectionLines
    .join("\n")
    .split(/\n{2,}/)
    .flatMap((block) => block.split("\n").filter(Boolean).map((line) => line.trim()))
    .filter((line) => /(university|college|school|institute|b\.?tech|m\.?tech|bachelor|master|mba|bsc|msc|diploma)/i.test(line))
    .slice(0, 6)
    .map((line) => {
      const rangeMatch = line.match(/\b((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2}|present)\b/i);
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      const gradeMatch = line.match(/\b(?:cgpa|gpa|grade)[:\s-]*([0-9.]+(?:\/[0-9.]+)?)\b/i);

      return {
        institution: line,
        degree: line.match(/(bachelor|master|mba|b\.?tech|m\.?tech|bsc|msc|diploma)/i)?.[0] || "",
        field: "",
        startYear: rangeMatch ? Number(rangeMatch[1]) : undefined,
        endYear: rangeMatch && rangeMatch[2].toLowerCase() !== "present" ? Number(rangeMatch[2]) : undefined,
        graduationYear: yearMatch ? Number(yearMatch[0]) : undefined,
        grade: gradeMatch ? gradeMatch[1] : "",
      };
    });
}

function inferExperience(sectionLines = []) {
  return normalizeList(sectionLines)
    .filter((line) => line.length > 12)
    .slice(0, 8)
    .map((line) => {
      const yearsMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:years|yrs)/i);
      const [role = line, company = ""] = line.split(/\s+at\s+|\s+\|\s+|,\s+(?=[A-Z])/);
      const durationMatch = line.match(/\b((?:19|20)\d{2}|present)\s*[-–]\s*((?:19|20)\d{2}|present)\b/i);
      return {
        company: company.trim(),
        role: role.trim(),
        employmentType: "",
        startDate: durationMatch ? durationMatch[1] : "",
        endDate: durationMatch ? durationMatch[2] : "",
        duration: durationMatch ? `${durationMatch[1]} - ${durationMatch[2]}` : "",
        years: yearsMatch ? Number(yearsMatch[1]) : 0,
        description: line,
        responsibilities: [],
        achievements: [],
        technologies: [],
        industries: [],
      };
    });
}

function inferProjects(sectionLines = []) {
  return normalizeList(sectionLines)
    .filter((line) => line.length > 8)
    .slice(0, 6)
    .map((line) => ({
      name: line.split(/[:|-]/)[0].trim(),
      description: line,
      technologies: [],
      role: "",
      url: "",
      githubUrl: "",
      achievements: [],
    }));
}

function inferSimpleList(sectionLines = []) {
  return normalizeList(
    sectionLines.flatMap((line) =>
      line
        .split(LIST_SEPARATOR_REGEX)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function inferLocation(rawText) {
  const lines = normalizeWhitespace(rawText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  const match = lines.find((line) => /,\s*[A-Za-z][A-Za-z ]+$/.test(line) && !/@|https?:\/\//i.test(line));
  return {
    location: match || "",
    city: "",
    state: "",
    country: "",
  };
}

function sanitizeSkillGroups(skillGroups = {}) {
  return {
    programmingLanguages: normalizeList(skillGroups.programmingLanguages || []),
    frameworks: normalizeList(skillGroups.frameworks || []),
    libraries: normalizeList(skillGroups.libraries || []),
    databases: normalizeList(skillGroups.databases || []),
    cloudPlatforms: normalizeList(skillGroups.cloudPlatforms || []),
    developmentTools: normalizeList(skillGroups.developmentTools || []),
    softSkills: normalizeList(skillGroups.softSkills || []),
    domainSkills: normalizeList(skillGroups.domainSkills || []),
  };
}

function computeResumeMatch(skills = [], requiredSkills = []) {
  const required = normalizeList(requiredSkills.map((skill) => skill.toLowerCase()));
  const available = new Set(normalizeList(skills.map((skill) => skill.toLowerCase())));
  const matchedSkills = required.filter((skill) => available.has(skill)).map(titleCase);
  const missingSkills = required.filter((skill) => !available.has(skill)).map(titleCase);
  const score = required.length === 0 ? Math.min(90, 55 + skills.length * 4) : Math.round((matchedSkills.length / required.length) * 100);

  return {
    status: score >= 75 ? "Strong Match" : score >= 45 ? "Partial Match" : "Low Match Requiring Recruiter Review",
    score,
    matchedSkills,
    missingSkills,
    explanation: "Resume matching is based on extracted skills and role-relevant keywords only.",
  };
}

function sanitizeAiProfile(aiProfile = {}) {
  return {
    name: String(aiProfile.name || "").trim(),
    email: String(aiProfile.email || "").trim(),
    phone: String(aiProfile.phone || "").trim(),
    professionalTitle: String(aiProfile.professionalTitle || "").trim(),
    summary: String(aiProfile.summary || "").trim(),
    totalExperienceYears: Number(aiProfile.totalExperienceYears || 0) || 0,
    currentRole: String(aiProfile.currentRole || "").trim(),
    previousRoles: normalizeList(aiProfile.previousRoles || []),
    industries: normalizeList(aiProfile.industries || []),
    careerLevel: String(aiProfile.careerLevel || "").trim(),
    location: String(aiProfile.location || "").trim(),
    city: String(aiProfile.city || "").trim(),
    state: String(aiProfile.state || "").trim(),
    country: String(aiProfile.country || "").trim(),
    skills: normalizeList(aiProfile.skills || []).slice(0, 50),
    skillGroups: sanitizeSkillGroups(aiProfile.skillGroups || {}),
    education: Array.isArray(aiProfile.education)
      ? aiProfile.education.map((item) => ({
          institution: String(item?.institution || "").trim(),
          degree: String(item?.degree || "").trim(),
          field: String(item?.field || "").trim(),
          startYear: Number(item?.startYear || 0) || undefined,
          endYear: Number(item?.endYear || 0) || undefined,
          graduationYear: Number(item?.graduationYear || 0) || undefined,
          grade: String(item?.grade || "").trim(),
        }))
      : [],
    experience: Array.isArray(aiProfile.experience)
      ? aiProfile.experience.map((item) => ({
          company: String(item?.company || "").trim(),
          role: String(item?.role || "").trim(),
          employmentType: String(item?.employmentType || "").trim(),
          startDate: String(item?.startDate || "").trim(),
          endDate: String(item?.endDate || "").trim(),
          duration: String(item?.duration || "").trim(),
          years: Number(item?.years || 0) || 0,
          description: String(item?.description || "").trim(),
          responsibilities: normalizeList(item?.responsibilities || []),
          achievements: normalizeList(item?.achievements || []),
          technologies: normalizeList(item?.technologies || []),
          industries: normalizeList(item?.industries || []),
        }))
      : [],
    projects: Array.isArray(aiProfile.projects)
      ? aiProfile.projects.map((item) => ({
          name: String(item?.name || "").trim(),
          description: String(item?.description || "").trim(),
          technologies: normalizeList(item?.technologies || []),
          role: String(item?.role || "").trim(),
          url: String(item?.url || "").trim(),
          githubUrl: String(item?.githubUrl || "").trim(),
          achievements: normalizeList(item?.achievements || []),
        }))
      : [],
    certifications: normalizeList(aiProfile.certifications || []),
    languages: normalizeList(aiProfile.languages || []),
    awards: normalizeList(aiProfile.awards || []),
    publications: normalizeList(aiProfile.publications || []),
    volunteerExperience: normalizeList(aiProfile.volunteerExperience || []),
    socialLinks: {
      linkedin: String(aiProfile.socialLinks?.linkedin || "").trim(),
      github: String(aiProfile.socialLinks?.github || "").trim(),
      portfolio: String(aiProfile.socialLinks?.portfolio || "").trim(),
      website: String(aiProfile.socialLinks?.website || "").trim(),
      other: normalizeList(aiProfile.socialLinks?.other || []),
    },
  };
}

export async function extractResumeText({ filePath, mimeType, filename }) {
  const buffer = await fs.readFile(filePath);
  const extension = path.extname(filename || filePath).toLowerCase();

  if (mimeType === "application/pdf" || extension === ".pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      const directText = normalizeWhitespace(parsed.text);
      if (directText.length >= MIN_DIRECT_TEXT_LENGTH) {
        return directText;
      }

      const ocrText = await extractTextFromPdfWithOcr(buffer);
      return normalizeWhitespace([directText, ocrText].filter(Boolean).join("\n\n"));
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || extension === ".docx") {
    const parsed = await mammoth.extractRawText({ buffer });
    return normalizeWhitespace(parsed.value);
  }

  if (mimeType === "application/msword" || extension === ".doc") {
    return normalizeWhitespace(buffer.toString("utf8"));
  }

  return "";
}

export function buildHeuristicResumeProfile({ rawText, filename, requiredSkills = [] }) {
  const email = extractEmail(rawText);
  const phone = extractPhone(rawText);
  const sections = buildSections(rawText);
  const links = extractLinks(rawText);
  const { name, professionalTitle } = inferNameAndTitle(rawText, email);
  const { location, city, state, country } = inferLocation(rawText);
  const skills = inferSkills(rawText, sections.skills, requiredSkills);
  const experience = inferExperience(sections.experience);
  const totalExperienceYears = experience.reduce((sum, item) => sum + Number(item.years || 0), 0);
  const currentRole = experience[0]?.role || professionalTitle || "";
  const previousRoles = experience.slice(1).map((item) => item.role).filter(Boolean);
  const skillGroups = categorizeSkills(skills);

  return {
    name: name || filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    email,
    phone,
    professionalTitle,
    summary: inferSummary(sections.summary),
    totalExperienceYears,
    currentRole,
    previousRoles,
    industries: [],
    careerLevel: inferCareerLevel(totalExperienceYears),
    location,
    city,
    state,
    country,
    skills,
    skillGroups,
    education: inferEducation(sections.education),
    experience,
    projects: inferProjects(sections.projects),
    certifications: inferSimpleList(sections.certifications),
    languages: inferSimpleList(sections.languages),
    awards: inferSimpleList(sections.awards),
    publications: inferSimpleList(sections.publications),
    volunteerExperience: inferSimpleList(sections.volunteer),
    socialLinks: links,
    resumeMatch: computeResumeMatch(skills, requiredSkills),
  };
}

export function mergeResumeProfiles({ heuristicProfile, aiProfile, requiredSkills = [] }) {
  const sanitizedAi = sanitizeAiProfile(aiProfile);
  const mergedSkills = normalizeList([...(sanitizedAi.skills || []), ...(heuristicProfile.skills || [])]);
  const mergedSkillGroups = sanitizeSkillGroups({
    programmingLanguages: [...(sanitizedAi.skillGroups?.programmingLanguages || []), ...(heuristicProfile.skillGroups?.programmingLanguages || [])],
    frameworks: [...(sanitizedAi.skillGroups?.frameworks || []), ...(heuristicProfile.skillGroups?.frameworks || [])],
    libraries: [...(sanitizedAi.skillGroups?.libraries || []), ...(heuristicProfile.skillGroups?.libraries || [])],
    databases: [...(sanitizedAi.skillGroups?.databases || []), ...(heuristicProfile.skillGroups?.databases || [])],
    cloudPlatforms: [...(sanitizedAi.skillGroups?.cloudPlatforms || []), ...(heuristicProfile.skillGroups?.cloudPlatforms || [])],
    developmentTools: [...(sanitizedAi.skillGroups?.developmentTools || []), ...(heuristicProfile.skillGroups?.developmentTools || [])],
    softSkills: [...(sanitizedAi.skillGroups?.softSkills || []), ...(heuristicProfile.skillGroups?.softSkills || [])],
    domainSkills: [...(sanitizedAi.skillGroups?.domainSkills || []), ...(heuristicProfile.skillGroups?.domainSkills || [])],
  });

  return {
    name: sanitizedAi.name || heuristicProfile.name,
    email: sanitizedAi.email || heuristicProfile.email,
    phone: sanitizedAi.phone || heuristicProfile.phone,
    professionalTitle: sanitizedAi.professionalTitle || heuristicProfile.professionalTitle,
    summary: sanitizedAi.summary || heuristicProfile.summary,
    totalExperienceYears: sanitizedAi.totalExperienceYears || heuristicProfile.totalExperienceYears,
    currentRole: sanitizedAi.currentRole || heuristicProfile.currentRole,
    previousRoles: normalizeList([...(sanitizedAi.previousRoles || []), ...(heuristicProfile.previousRoles || [])]),
    industries: normalizeList([...(sanitizedAi.industries || []), ...(heuristicProfile.industries || [])]),
    careerLevel: sanitizedAi.careerLevel || heuristicProfile.careerLevel,
    location: sanitizedAi.location || heuristicProfile.location,
    city: sanitizedAi.city || heuristicProfile.city,
    state: sanitizedAi.state || heuristicProfile.state,
    country: sanitizedAi.country || heuristicProfile.country,
    skills: mergedSkills,
    skillGroups: mergedSkillGroups,
    education: sanitizedAi.education?.length ? sanitizedAi.education : heuristicProfile.education,
    experience: sanitizedAi.experience?.length ? sanitizedAi.experience : heuristicProfile.experience,
    projects: sanitizedAi.projects?.length ? sanitizedAi.projects : heuristicProfile.projects,
    certifications: sanitizedAi.certifications?.length ? sanitizedAi.certifications : heuristicProfile.certifications,
    languages: sanitizedAi.languages?.length ? sanitizedAi.languages : heuristicProfile.languages,
    awards: sanitizedAi.awards?.length ? sanitizedAi.awards : heuristicProfile.awards,
    publications: sanitizedAi.publications?.length ? sanitizedAi.publications : heuristicProfile.publications,
    volunteerExperience: sanitizedAi.volunteerExperience?.length ? sanitizedAi.volunteerExperience : heuristicProfile.volunteerExperience,
    socialLinks: {
      linkedin: sanitizedAi.socialLinks.linkedin || heuristicProfile.socialLinks.linkedin,
      github: sanitizedAi.socialLinks.github || heuristicProfile.socialLinks.github,
      portfolio: sanitizedAi.socialLinks.portfolio || heuristicProfile.socialLinks.portfolio,
      website: sanitizedAi.socialLinks.website || heuristicProfile.socialLinks.website,
      other: normalizeList([...(sanitizedAi.socialLinks.other || []), ...(heuristicProfile.socialLinks.other || [])]),
    },
    resumeMatch: computeResumeMatch(mergedSkills, requiredSkills),
  };
}
