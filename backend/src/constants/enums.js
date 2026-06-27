export const USER_ROLES = ["recruiter", "candidate", "interviewer", "admin"];
export const BILLING_ROLES = ["owner", "billing_admin", "recruiter", "interviewer"];

export const VERIFICATION_STATUSES = ["Pending", "Verified", "Rejected"];
export const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1000+ employees",
];

export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Internship",
  "Contract",
  "Temporary",
];

export const WORKPLACE_TYPES = ["On-site", "Remote", "Hybrid"];
export const SALARY_PERIODS = ["Hourly", "Monthly", "Yearly"];
export const JOB_STATUSES = ["Draft", "Published", "Paused", "Closed", "Expired"];
export const APPLICATION_STATUSES = [
  "Draft",
  "Applied",
  "Under Review",
  "Shortlisted",
  "Interview Scheduled",
  "Selected",
  "Rejected",
  "Withdrawn",
];
export const INTERVIEW_TYPES = [
  "Phone",
  "Video",
  "In-person",
  "Technical",
  "HR",
  "Final round",
];
export const INTERVIEW_STATUSES = [
  "Scheduled",
  "Rescheduled",
  "Completed",
  "Cancelled",
  "Candidate No-show",
  "Interviewer No-show",
];
export const RECOMMENDATION_OPTIONS = ["Strong hire", "Hire", "Hold", "No hire"];
export const ASSESSMENT_STATUSES = ["Draft", "Published", "Paused", "Archived"];
export const ASSESSMENT_CATEGORIES = [
  "Technical",
  "Aptitude",
  "General screening",
  "Role-specific",
  "Coding",
  "Mixed assessment",
];
export const ASSESSMENT_EXPERIENCE_LEVELS = ["Fresher", "Entry level", "Intermediate", "Senior"];
export const SECTION_TYPES = ["MCQ", "Syntax and Debugging", "Logic Test", "Coding Test", "Short Answer", "File Submission"];
export const QUESTION_TYPES = [
  "MCQ",
  "Syntax and Debugging",
  "Logic Test",
  "Coding Test",
  "Short Answer",
  "File Submission",
];
export const QUESTION_DIFFICULTIES = ["Easy", "Medium", "Hard"];
export const QUESTION_SOURCES = ["Manual", "AI Generated", "Question Bank"];
export const INVITATION_STATUSES = ["Pending", "Sent", "Opened", "Resume Submitted", "Started", "Completed", "Expired", "Cancelled"];
export const ATTEMPT_STATUSES = ["Pending", "In Progress", "Submitted", "Evaluated", "Expired"];
export const REVIEW_STATUSES = ["Awaiting Review", "Reviewed", "Shortlisted", "Rejected", "Interview Scheduled"];
export const INTEGRITY_STATUSES = ["No Significant Flags", "Low Concern", "Review Recommended", "High Number of Flags"];
export const RESUME_MATCH_STATUSES = ["Strong Match", "Partial Match", "Low Match Requiring Recruiter Review"];
export const SUBSCRIPTION_STATUSES = ["Trial", "Active", "Past Due", "Payment Failed", "Paused", "Cancelled", "Expired"];
export const BILLING_CYCLES = ["monthly", "yearly"];
export const CREDIT_TYPES = [
  "aiQuestionCredits",
  "resumeAnalysisCredits",
  "codingExecutionCredits",
  "cameraProctoringCredits",
  "candidateInvitationCredits",
];
export const USAGE_RESOURCE_TYPES = [
  "activeJobs",
  "recruiterSeats",
  "candidateInvitations",
  "resumeAnalyses",
  "aiQuestionGenerations",
  "codingExecutions",
  "proctoringMinutes",
  "storageGB",
  "emailNotifications",
];
export const INVOICE_STATUSES = ["Paid", "Open", "Pending", "Failed", "Refunded", "Partially Refunded", "Void"];
