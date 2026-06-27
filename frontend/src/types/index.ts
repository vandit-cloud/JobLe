export type VerificationStatus = "Pending" | "Verified" | "Rejected";
export type JobStatus = "Draft" | "Published" | "Paused" | "Closed" | "Expired";
export type ApplicationStatus =
  | "Draft"
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview Scheduled"
  | "Selected"
  | "Rejected"
  | "Withdrawn";
export type InterviewStatus =
  | "Scheduled"
  | "Rescheduled"
  | "Completed"
  | "Cancelled"
  | "Candidate No-show"
  | "Interviewer No-show";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  sessionId?: string | null;
  recruiterId?: string | null;
  candidateId?: string | null;
  companyId?: string | null;
  billingRole?: string | null;
  candidateProfile?: {
    professionalTitle?: string;
    location?: string;
  } | null;
}

export interface Company {
  _id: string;
  name: string;
  logo?: string;
  website?: string;
  industry: string;
  companySize?: string;
  foundedYear?: number;
  email?: string;
  phone?: string;
  headquarters?: string;
  officeLocations: string[];
  description: string;
  mission?: string;
  culture?: string;
  benefits: string[];
  socialLinks: {
    linkedin?: string;
    other: string[];
  };
  verificationStatus: VerificationStatus;
  profileCompletion: number;
  missingFields?: string[];
}

export interface Job {
  _id: string;
  title: string;
  department?: string;
  openings: number;
  employmentType: string;
  workplaceType: string;
  location: string;
  summary: string;
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  minimumEducation?: string;
  minimumExperience: number;
  maximumExperience: number;
  certifications: string[];
  languages: string[];
  salary: {
    minimum?: number;
    maximum?: number;
    currency: string;
    period: string;
    showPublicly: boolean;
  };
  applicationDeadline: string;
  screeningQuestions: string[];
  requireResume: boolean;
  requireCoverLetter: boolean;
  applicationInstructions?: string;
  status: JobStatus;
  publishedAt?: string;
  archivedAt?: string;
  createdAt: string;
  applicantsCount?: number;
  shortlistedCount?: number;
  company?: Company;
  hasAssessment?: boolean;
}

export interface Candidate {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  professionalTitle?: string;
  summary?: string;
  careerObjective?: string;
  yearsOfExperience?: number;
  employmentStatus?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  skills: string[];
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationYear: number;
  }>;
  experience: Array<{
    company: string;
    role: string;
    years: number;
    description: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
  certifications: string[];
  languages: string[];
  resumeUrl: string;
  availability?: string;
  socialLinks?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    website?: string;
    other?: string[];
  };
  jobPreferences?: {
    preferredRoles: string[];
    preferredIndustries: string[];
    preferredLocations: string[];
    remotePreference?: string;
    employmentTypes: string[];
    expectedSalary?: number;
    currency?: string;
    noticePeriod?: string;
    availableJoiningDate?: string;
    willingToRelocate?: boolean;
    openToRecruiterDiscovery?: boolean;
  };
  profileCompletion?: number;
  discoverable?: boolean;
}

export interface MatchAnalysis {
  overallScore: number;
  scores: {
    skills: number;
    experience: number;
    education: number;
    projects: number;
    preference: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
  recommendationLabel?: string;
  lastAnalyzedAt?: string;
}

export interface ApplicationRecord {
  _id: string;
  jobId: Job | string;
  job?: Job;
  candidateId: Candidate | string;
  recruiterId: string;
  resumeUrl: string;
  coverLetter?: string;
  screeningAnswers: Array<{ question: string; answer: string }>;
  status: ApplicationStatus;
  matchAnalysis?: MatchAnalysis;
  recruiterNotes: Array<{ note: string; action: string; createdAt: string }>;
  appliedAt: string;
  shortlistedAt?: string;
  rejectedAt?: string;
  selectedAt?: string;
  withdrawnAt?: string;
  updatedAt?: string;
}

export interface Interview {
  _id: string;
  applicationId: ApplicationRecord | string;
  jobId: Job | string;
  job?: Job;
  candidateId: Candidate | string;
  recruiterId: string;
  title: string;
  round?: string;
  startDateTime: string;
  duration: number;
  timezone: string;
  interviewType: string;
  interviewerName: string;
  interviewerEmail: string;
  meetingLink?: string;
  location?: string;
  notes?: string;
  candidateInstructions?: string;
  candidateStatus?: string;
  recruiterStatus?: string;
  rescheduleRequest?: {
    status: string;
    reason?: string;
    preferredDates: string[];
    preferredTimeRanges: string[];
    additionalNote?: string;
    requestedAt?: string;
  };
  status: InterviewStatus;
  feedback?: {
    technicalSkillsScore: number;
    communicationScore: number;
    problemSolvingScore: number;
    relevantExperienceScore: number;
    strengths: string;
    concerns: string;
    internalNotes?: string;
    recommendation: string;
    submittedAt?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type AssessmentStatus = "Draft" | "Published" | "Paused" | "Archived";
export type InvitationStatus = "Pending" | "Sent" | "Opened" | "Resume Submitted" | "Started" | "Completed" | "Expired" | "Cancelled";
export type AttemptStatus = "Pending" | "In Progress" | "Submitted" | "Evaluated" | "Expired";
export type ReviewStatus = "Awaiting Review" | "Reviewed" | "Shortlisted" | "Rejected" | "Interview Scheduled";
export type IntegrityStatus = "No Significant Flags" | "Low Concern" | "Review Recommended" | "High Number of Flags";
export type SubscriptionStatus = "Trial" | "Active" | "Past Due" | "Payment Failed" | "Paused" | "Cancelled" | "Expired";
export type BillingCycle = "monthly" | "yearly";

export interface AssessmentQuestion {
  _id?: string;
  questionText: string;
  questionType: string;
  skill?: string;
  topic?: string;
  difficulty: string;
  marks: number;
  negativeMarks: number;
  expectedAnswer?: string;
  answerExplanation?: string;
  recommendedTime?: number;
  source: string;
  options?: Array<{ id: string; text: string }>;
  correctOptionIds?: string[];
  multipleCorrect?: boolean;
  programmingLanguage?: string;
  codeSnippet?: string;
  alternativeAcceptedAnswers?: string[];
  problemTitle?: string;
  problemStatement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  allowedLanguages?: string[];
  starterCode?: Record<string, string>;
  visibleTestCases?: Array<{ input: string; output: string; explanation?: string }>;
  hiddenTestCases?: Array<{ input: string; output: string }>;
  timeLimit?: number;
  memoryLimit?: number;
}

export interface AssessmentSection {
  _id?: string;
  title: string;
  description?: string;
  type: string;
  duration: number;
  numberOfQuestions: number;
  totalMarks: number;
  passingScore: number;
  negativeMarking: boolean;
  sectionOrder: number;
  isMandatory: boolean;
  questions: AssessmentQuestion[];
}

export interface Assessment {
  _id: string;
  organizationId: string;
  recruiterId: string;
  jobId?: string | Job | null;
  title: string;
  description?: string;
  category: string;
  experienceLevel: string;
  assessmentLanguage: string;
  candidateInstructions: string;
  sections: AssessmentSection[];
  settings: {
    totalDuration: number;
    overallPassingPercentage: number;
    maximumAttempts: number;
    assessmentStartDate?: string;
    assessmentEndDate?: string;
    invitationLinkExpiry?: string;
    autoSubmitWhenTimeEnds: boolean;
    allowCandidateReviewPreviousAnswers: boolean;
    allowCandidateChangeAnswersBeforeSubmission: boolean;
    allowCalculator: boolean;
    allowCodeExecution: boolean;
    requireResume: boolean;
    requireCandidateEmailVerification: boolean;
    requireCandidateConsent: boolean;
    showResultImmediately: boolean;
    allowRetake: boolean;
    retakeWaitingPeriod: number;
  };
  resumeMatchSettings: {
    requiredSkills: string[];
    strongMatchThreshold: number;
    partialMatchThreshold: number;
    allowRecruiterOverride: boolean;
  };
  integritySettings: Record<string, boolean>;
  resultVisibility: Record<string, boolean>;
  status: AssessmentStatus;
  totalDuration: number;
  totalMarks: number;
  passingPercentage: number;
  createdAt: string;
  updatedAt: string;
  sectionsCount?: number;
  questionsCount?: number;
  invitedCandidates?: number;
  attemptsCount?: number;
  completedAttempts?: number;
  completionRate?: number;
}

export interface AssessmentInvitation {
  _id: string;
  assessmentId: Assessment | string;
  jobId?: Job | string | null;
  candidateId?: Candidate | string | null;
  candidateName?: string;
  candidateEmail: string;
  invitationToken: string;
  status: InvitationStatus;
  expiresAt?: string;
  maxAttempts: number;
  attemptsUsed: number;
  emailVerificationCode?: string;
  sentAt?: string;
  openedAt?: string;
  resumeSubmittedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AssessmentAttempt {
  _id: string;
  assessmentId: Assessment | string;
  invitationId: AssessmentInvitation | string;
  candidateId?: Candidate | string | null;
  candidateProfile: {
    name: string;
    email: string;
    phone?: string;
    skills: string[];
    education: any[];
    experience: any[];
    projects: any[];
    certifications: string[];
    resumeUrl?: string;
  };
  resumeMatch: {
    status: string;
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    explanation: string;
    recruiterOverride?: boolean;
  };
  answers: Array<{
    questionId: string;
    sectionId: string;
    questionType: string;
    answerText?: string;
    selectedOptionIds?: string[];
    score?: number;
    aiSuggestedScore?: number;
    codingSubmission?: {
      programmingLanguage: string;
      code: string;
      executionResults: {
        passedTestCases: number;
        failedTestCases: number;
        totalTestCases: number;
        executionTime: number;
        memoryUsage: number;
        compilerOutput: string;
        visibleResults: Array<{ input: string; expectedOutput: string; actualOutput: string; passed: boolean }>;
      };
      submissionHistory: Array<{
        code: string;
        language: string;
        submittedAt: string;
        passedTestCases: number;
        failedTestCases: number;
      }>;
      codeSimilarityWarning?: boolean;
    };
  }>;
  sectionResults: Array<{ sectionId: string; title: string; score: number; totalMarks: number }>;
  totalScore: number;
  passingStatus: boolean;
  recruiterRecommendation?: string;
  completionTimeMinutes?: number;
  attemptNumber: number;
  recruiterReview: {
    status: ReviewStatus;
    note?: string;
    reviewedAt?: string;
  };
  integritySummary: {
    status: IntegrityStatus;
    totalFlags: number;
    tabSwitches: number;
    focusLosses: number;
    fullScreenExits: number;
    copyAttempts: number;
    pasteAttempts: number;
    cameraInterruptions: number;
    candidateAbsenceFlags: number;
    multiplePeopleFlags: number;
    deviceChanges: number;
    ipChanges: number;
    codeSimilarityFlags: number;
  };
  activityTimeline: Array<{ label: string; metadata: Record<string, unknown>; createdAt: string }>;
  status: AttemptStatus;
  startedAt?: string;
  submittedAt?: string;
}

export interface IntegrityEvent {
  _id: string;
  eventType: string;
  severity: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SubscriptionPlan {
  _id: string;
  name: string;
  code: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  limits: Record<string, number>;
  features: Record<string, boolean>;
  trialDays: number;
  active: boolean;
  displayOrder: number;
}

export interface SubscriptionRecord {
  _id: string;
  organizationId: string;
  planId: SubscriptionPlan;
  provider: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string | null;
  pausedAt?: string | null;
  nextBillingDate?: string;
}

export interface UsageOverview {
  resourceType: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  percentageUsed: number | null;
  resetDate: string | null;
  state: string;
  additionalCreditsRemaining: number;
}

export interface PaymentMethodRecord {
  _id: string;
  type: string;
  brand: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface InvoiceRecord {
  _id: string;
  invoiceNumber: string;
  planName: string;
  amount: number;
  discount: number;
  tax: number;
  totalAmount: number;
  currency: string;
  status: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoiceUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export interface SavedJobRecord {
  _id: string;
  savedAt: string;
  job: Job;
}

export interface CandidateDashboardResponse {
  statistics: {
    profileCompletion: number;
    resumeScore: number;
    totalApplications: number;
    underReview: number;
    shortlisted: number;
    pendingAssessments: number;
    completedAssessments: number;
    upcomingInterviews: number;
    savedJobs: number;
    unreadNotifications: number;
  };
  profileMissingFields: string[];
  recommendedJobs: Array<Job & { company?: Company; match: MatchAnalysis; isSaved: boolean }>;
  pendingAssessments: Array<AssessmentInvitation & { assessment?: Assessment; job?: Job }>;
  recentApplicationUpdates: ApplicationRecord[];
  upcomingInterviews: Interview[];
  recentNotifications: CandidateNotification[];
}

export interface CandidateNotification {
  _id: string;
  category: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface CandidatePrivacySettings {
  _id?: string;
  profileVisibility: string;
  resumeVisibility: string;
  skillPassportVisibility: string;
  contactVisibility: {
    email: boolean;
    phone: boolean;
    location: boolean;
    socialLinks: boolean;
  };
  recruiterDiscovery: {
    discoverableByVerifiedRecruiters: boolean;
    recruitersCanSendOpportunities: boolean;
    blockedOrganizations: string[];
    blockedRecruiters: string[];
  };
  communicationPreferences: {
    applicationUpdates: boolean;
    assessmentReminders: boolean;
    interviewReminders: boolean;
    jobRecommendations: boolean;
    recruiterMessages: boolean;
    productAnnouncements: boolean;
    marketingMessages: boolean;
  };
  aiPreferences: {
    enableRecommendations: boolean;
    requestManualReview: boolean;
  };
}

export interface ResumeRecord {
  _id: string;
  candidateId: string;
  originalName: string;
  privateFileKey: string;
  resumeUrl: string;
  mimeType: string;
  fileSize: number;
  isDefault: boolean;
  processingStatus: string;
  analysisStatus: string;
  extractedData: Record<string, any>;
  confirmedData: Record<string, any>;
  analysis: {
    overallScore?: number;
    sectionScores?: Record<string, number>;
    strengths?: string[];
    improvements?: string[];
    recommendedRoles?: string[];
    suggestedKeywords?: string[];
    updatedAt?: string;
  };
  visibility: {
    useForApplications: boolean;
    visibleAfterApplication: boolean;
    discoverableByVerifiedRecruiters: boolean;
    keepPrivate: boolean;
  };
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateSecuritySession {
  _id: string;
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  approximateLocation: string;
  createdAt: string;
  lastActivityAt: string;
  isCurrent: boolean;
}

export interface CandidateApplicationsResponse extends PaginatedResponse<ApplicationRecord> {
  summary: {
    totalApplications: number;
    applied: number;
    underReview: number;
    shortlisted: number;
    interviewScheduled: number;
    selected: number;
    rejected: number;
    withdrawn: number;
    assessmentPending: number;
    assessmentCompleted: number;
  };
}

export interface CandidateInterviewsResponse extends PaginatedResponse<Interview> {
  summary: {
    upcoming: number;
    completed: number;
    cancelled: number;
    total: number;
  };
}
