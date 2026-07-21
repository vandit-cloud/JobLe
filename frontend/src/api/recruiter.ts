import api from "../lib/axios";
import type {
  AdminResumeSecurityReview,
  AlternativeVerificationRequest,
  ApplicationRecord,
  Assessment,
  AssessmentAttempt,
  AssessmentInvitation,
  AuthUser,
  Candidate,
  CandidateIdentityVerification,
  CandidateDashboardResponse,
  CandidateApplicationsResponse,
  CandidateInterviewsResponse,
  CandidateNotification,
  CandidatePrivacySettings,
  CandidateSecuritySession,
  Company,
  IntegrityEvent,
  IdentityVerificationEvent,
  Interview,
  InvoiceRecord,
  Job,
  MatchAnalysis,
  PaginatedResponse,
  PaymentMethodRecord,
  SavedJobRecord,
  ResumeRecord,
  SkillPassport,
  TalentInvitation,
  TalentPoolCandidate,
  SubscriptionPlan,
  SubscriptionRecord,
  UsageOverview,
} from "../types";

export async function loginRecruiter(payload: { email: string; password: string }) {
  const response = await api.post<{ token: string; user: AuthUser }>("/auth/recruiter/login", payload);
  return response.data;
}

export async function registerRecruiter(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  position?: string;
  companyName: string;
  companyIndustry: string;
  companyWebsite?: string;
}) {
  const response = await api.post<{ token: string; user: AuthUser }>("/auth/recruiter/register", payload);
  return response.data;
}

export async function loginCandidate(payload: { email: string; password: string }) {
  const response = await api.post<{ token: string; user: AuthUser }>("/auth/candidate/login", payload);
  return response.data;
}

export async function loginAdmin(payload: { email: string; password: string }) {
  const response = await api.post<{ token: string; user: AuthUser }>("/auth/admin/login", payload);
  return response.data;
}

export async function registerCandidate(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  professionalTitle?: string;
  location?: string;
}) {
  const response = await api.post<{ token: string; user: AuthUser }>("/auth/candidate/register", payload);
  return response.data;
}

export async function fetchCurrentUser() {
  const response = await api.get<{ user: AuthUser }>("/auth/me");
  return response.data.user;
}

export async function fetchAdminResumeSecurityReview() {
  const response = await api.get<AdminResumeSecurityReview>("/admin/resume-security");
  return response.data;
}

export async function deleteAdminRejectedResumeFile(resumeId: string) {
  const response = await api.delete<{ message: string }>(`/admin/resume-security/${resumeId}/rejected-file`);
  return response.data.message;
}

export async function fetchDashboard() {
  const response = await api.get("/recruiter/dashboard");
  return response.data;
}

export async function fetchCompanyProfile() {
  const response = await api.get<{ company: Company | null; profileCompletion: number; missingFields: string[] }>("/recruiter/company");
  return response.data;
}

export async function createCompany(payload: Partial<Company>) {
  const response = await api.post("/recruiter/company", payload);
  return response.data.company as Company;
}

export async function updateCompany(payload: Partial<Company>) {
  const response = await api.put("/recruiter/company", payload);
  return response.data.company as Company;
}

export async function uploadCompanyLogo(file: File) {
  const formData = new FormData();
  formData.append("logo", file);
  const response = await api.post<{ logo: string }>("/recruiter/company/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.logo;
}

export async function generateJobDescription(payload: {
  jobTitle: string;
  experienceLevel: string;
  skills: string[];
  employmentType: string;
}) {
  const response = await api.post("/recruiter/jobs/generate-description", payload);
  return response.data;
}

export async function createJob(payload: Partial<Job>) {
  const response = await api.post<{ job: Job }>("/recruiter/jobs", payload);
  return response.data.job;
}

export async function createDraftJob(payload: Partial<Job>) {
  const response = await api.post<{ job: Job }>("/recruiter/jobs/draft", payload);
  return response.data.job;
}

export async function fetchJobs(params: Record<string, string | number | undefined>) {
  const response = await api.get<PaginatedResponse<Job> & { stats: Array<{ _id: string; count: number }> }>("/recruiter/jobs", { params });
  return response.data;
}

export async function fetchJob(jobId: string) {
  const response = await api.get<{ job: Job; applicantCount: number }>(`/recruiter/jobs/${jobId}`);
  return response.data;
}

export async function updateJob(jobId: string, payload: Partial<Job>) {
  const response = await api.put<{ job: Job }>(`/recruiter/jobs/${jobId}`, payload);
  return response.data.job;
}

export async function updateJobStatus(jobId: string, status: string) {
  const response = await api.patch<{ job: Job }>(`/recruiter/jobs/${jobId}/status`, { status });
  return response.data.job;
}

export async function duplicateJob(jobId: string) {
  const response = await api.post<{ job: Job }>(`/recruiter/jobs/${jobId}/duplicate`);
  return response.data.job;
}

export async function deleteJob(jobId: string) {
  const response = await api.delete<{ message: string }>(`/recruiter/jobs/${jobId}`);
  return response.data.message;
}

export async function fetchApplications(params: Record<string, string | number | undefined>) {
  const response = await api.get<PaginatedResponse<ApplicationRecord> & { summary: Array<{ _id: string; count: number }>; jobs: Array<{ _id: string; title: string }> }>("/recruiter/applications", { params });
  return response.data;
}

export async function fetchApplication(applicationId: string) {
  const response = await api.get<{ application: ApplicationRecord }>(`/recruiter/applications/${applicationId}`);
  return response.data.application;
}

export async function updateApplicationStatus(applicationId: string, payload: { status: string; note?: string }) {
  const response = await api.patch<{ application: ApplicationRecord }>(`/recruiter/applications/${applicationId}/status`, payload);
  return response.data.application;
}

export async function analyzeApplication(applicationId: string) {
  const response = await api.post<{ analysis: MatchAnalysis; notice: string }>(`/recruiter/applications/${applicationId}/analyze`);
  return response.data;
}

export async function fetchResume(applicationId: string) {
  const response = await api.get<{ resumeUrl: string }>(`/recruiter/applications/${applicationId}/resume`);
  return response.data.resumeUrl;
}

export async function fetchShortlisted() {
  const response = await api.get<{ items: ApplicationRecord[]; summary: Record<string, number> }>("/recruiter/applications/shortlisted");
  return response.data;
}

export async function removeShortlist(applicationId: string, payload: { nextStatus: string; note?: string }) {
  const response = await api.patch<{ application: ApplicationRecord }>(`/recruiter/applications/${applicationId}/remove-shortlist`, payload);
  return response.data.application;
}

export async function selectCandidate(applicationId: string) {
  const response = await api.patch<{ application: ApplicationRecord }>(`/recruiter/applications/${applicationId}/select`);
  return response.data.application;
}

export async function compareCandidates(applicationIds: string[]) {
  const response = await api.post("/recruiter/applications/compare", { applicationIds });
  return response.data;
}

export async function fetchTalentPool(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<{ items: TalentPoolCandidate[]; summary: Record<string, number> }>("/recruiter/talent-pool", { params });
  return response.data;
}

export async function inviteTalentCandidate(
  candidateId: string,
  payload: { actionType?: string; jobId?: string; message?: string },
) {
  const response = await api.post<{ message: string }>(`/recruiter/talent-pool/${candidateId}/invite`, payload);
  return response.data.message;
}

export async function fetchInterviews() {
  const response = await api.get("/recruiter/interviews");
  return response.data as {
    upcoming: Interview[];
    completed: Interview[];
    cancelled: Interview[];
    all: Interview[];
  };
}

export async function fetchInterview(interviewId: string) {
  const response = await api.get<{ interview: Interview }>(`/recruiter/interviews/${interviewId}`);
  return response.data.interview;
}

export async function createInterview(payload: Partial<Interview> & { sendNotification?: boolean }) {
  const response = await api.post("/recruiter/interviews", payload);
  return response.data;
}

export async function updateInterview(interviewId: string, payload: Partial<Interview>) {
  const response = await api.put(`/recruiter/interviews/${interviewId}`, payload);
  return response.data;
}

export async function cancelInterview(interviewId: string, reason: string) {
  const response = await api.patch(`/recruiter/interviews/${interviewId}/cancel`, { reason });
  return response.data;
}

export async function submitInterviewFeedback(interviewId: string, payload: Record<string, unknown>) {
  const response = await api.post(`/recruiter/interviews/${interviewId}/feedback`, payload);
  return response.data;
}

export async function generateInterviewQuestions(payload: {
  applicationId: string;
  jobTitle: string;
  candidateName: string;
  count: number;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
}) {
  const response = await api.post("/recruiter/interviews/generate-questions", payload);
  return response.data;
}

export async function fetchAssessments(params: Record<string, string | number | undefined>) {
  const response = await api.get<
    PaginatedResponse<Assessment> & {
      summary: {
        statuses: Array<{ _id: string; count: number }>;
        totalInvitations: number;
        testsStarted: number;
        testsCompleted: number;
        candidatesAwaitingReview: number;
        candidatesWithIntegrityFlags: number;
      };
    }
  >("/recruiter/assessments", { params });
  return response.data;
}

export async function fetchAssessment(assessmentId: string) {
  const response = await api.get<{ assessment: Assessment; relatedJob?: Job | null; invitationCount: number; resultsCount: number }>(
    `/recruiter/assessments/${assessmentId}`,
  );
  return response.data;
}

export async function createAssessment(payload: Partial<Assessment>) {
  const response = await api.post<{ assessment: Assessment }>("/recruiter/assessments", payload);
  return response.data.assessment;
}

export async function updateAssessment(assessmentId: string, payload: Partial<Assessment>) {
  const response = await api.put<{ assessment: Assessment }>(`/recruiter/assessments/${assessmentId}`, payload);
  return response.data.assessment;
}

export async function updateAssessmentStatus(assessmentId: string, status: string) {
  const response = await api.patch<{ assessment: Assessment }>(`/recruiter/assessments/${assessmentId}/status`, { status });
  return response.data.assessment;
}

export async function duplicateAssessment(assessmentId: string) {
  const response = await api.post<{ assessment: Assessment }>(`/recruiter/assessments/${assessmentId}/duplicate`);
  return response.data.assessment;
}

export async function publishAssessment(assessmentId: string) {
  const response = await api.post<{ assessment: Assessment }>(`/recruiter/assessments/${assessmentId}/publish`);
  return response.data.assessment;
}

export async function deleteAssessment(assessmentId: string) {
  const response = await api.delete<{ message: string }>(`/recruiter/assessments/${assessmentId}`);
  return response.data.message;
}

export async function generateAssessmentQuestions(payload: Record<string, unknown>) {
  const response = await api.post<{ questions: any[]; notice: string }>("/recruiter/assessments/generate-questions", payload);
  return response.data;
}

export async function fetchQuestionBank(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<PaginatedResponse<any>>("/recruiter/question-bank", { params });
  return response.data;
}

export async function createQuestionBankItem(payload: Record<string, unknown>) {
  const response = await api.post("/recruiter/question-bank", payload);
  return response.data;
}

export async function updateQuestionBankItem(questionId: string, payload: Record<string, unknown>) {
  const response = await api.put(`/recruiter/question-bank/${questionId}`, payload);
  return response.data;
}

export async function deleteQuestionBankItem(questionId: string) {
  const response = await api.delete<{ message: string }>(`/recruiter/question-bank/${questionId}`);
  return response.data.message;
}

export async function createAssessmentInvitations(payload: Record<string, unknown>) {
  const response = await api.post<{ invitations: AssessmentInvitation[] }>("/recruiter/assessment-invitations", payload);
  return response.data;
}

export async function fetchAssessmentInvitations(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<PaginatedResponse<AssessmentInvitation>>("/recruiter/assessment-invitations", { params });
  return response.data;
}

export async function resendAssessmentInvitation(invitationId: string) {
  const response = await api.post(`/recruiter/assessment-invitations/${invitationId}/resend`);
  return response.data;
}

export async function cancelAssessmentInvitation(invitationId: string) {
  const response = await api.patch(`/recruiter/assessment-invitations/${invitationId}/cancel`);
  return response.data;
}

export async function fetchAssessmentResults(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<PaginatedResponse<AssessmentAttempt & { recommendation: string }>>("/recruiter/assessment-results", { params });
  return response.data;
}

export async function fetchAssessmentResult(attemptId: string) {
  const response = await api.get<{ attempt: AssessmentAttempt; integrityEvents: IntegrityEvent[]; recommendation: string }>(
    `/recruiter/assessment-results/${attemptId}`,
  );
  return response.data;
}

export async function fetchRecruiterIdentityReport(attemptId: string) {
  const response = await api.get<{
    attempt: AssessmentAttempt;
    verification: CandidateIdentityVerification;
    events: IdentityVerificationEvent[];
    alternativeRequests: AlternativeVerificationRequest[];
    imageUrls: Record<"front" | "left" | "right", string>;
    summary: Record<string, unknown>;
    warning: string;
  }>(`/recruiter/assessment-results/${attemptId}/identity-report`);
  return response.data;
}

export async function reviewRecruiterIdentityReport(attemptId: string, payload: { reviewStatus: string; recruiterNote?: string }) {
  const response = await api.patch<{ verification: CandidateIdentityVerification }>(`/recruiter/assessment-results/${attemptId}/identity-report/review`, payload);
  return response.data.verification;
}

export async function requestRecruiterIdentityRetest(attemptId: string, note?: string) {
  const response = await api.post<{ verification: CandidateIdentityVerification }>(`/recruiter/assessment-results/${attemptId}/identity-report/request-retest`, { note });
  return response.data.verification;
}

export async function requestRecruiterCandidateExplanation(attemptId: string, note?: string) {
  const response = await api.post<{ verification: CandidateIdentityVerification }>(`/recruiter/assessment-results/${attemptId}/identity-report/request-explanation`, { note });
  return response.data.verification;
}

export async function reviewAssessmentResult(attemptId: string, payload: { status: string; note?: string }) {
  const response = await api.patch(`/recruiter/assessment-results/${attemptId}/review`, payload);
  return response.data;
}

export async function adjustAssessmentScore(attemptId: string, payload: { questionId: string; newScore: number; reason: string }) {
  const response = await api.patch(`/recruiter/assessment-results/${attemptId}/score`, payload);
  return response.data;
}

export async function fetchAssessmentIntegrity(attemptId: string) {
  const response = await api.get<{ integritySummary: AssessmentAttempt["integritySummary"]; events: IntegrityEvent[]; warning: string }>(
    `/recruiter/assessment-results/${attemptId}/integrity`,
  );
  return response.data;
}

export async function fetchCandidateAssessmentContext(invitationToken: string) {
  const response = await api.get(`/candidate/assessment/${invitationToken}`);
  return response.data;
}

export async function verifyCandidateInvitation(invitationToken: string, payload: { email: string; code: string }) {
  const response = await api.post(`/candidate/assessment/${invitationToken}/verify`, payload);
  return response.data;
}

export async function uploadCandidateResume(invitationToken: string, file: File) {
  const formData = new FormData();
  formData.append("resume", file);
  const response = await api.post(`/candidate/assessment/${invitationToken}/resume`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function updateCandidateAssessmentProfile(invitationToken: string, payload: Record<string, unknown>) {
  const response = await api.put(`/candidate/assessment/${invitationToken}/profile`, payload);
  return response.data;
}

export async function startCandidateAssessment(invitationToken: string) {
  const response = await api.post(`/candidate/assessment/${invitationToken}/start`);
  return response.data;
}

export async function saveCandidateAssessmentAnswer(invitationToken: string, payload: Record<string, unknown>) {
  const response = await api.post(`/candidate/assessment/${invitationToken}/save-answer`, payload);
  return response.data;
}

export async function runCandidateAssessmentCode(invitationToken: string, payload: Record<string, unknown>) {
  const response = await api.post(`/candidate/assessment/${invitationToken}/run-code`, payload);
  return response.data;
}

export async function recordCandidateAssessmentIntegrity(invitationToken: string, payload: Record<string, unknown>) {
  const response = await api.post(`/candidate/assessment/${invitationToken}/integrity-event`, payload);
  return response.data;
}

export async function submitCandidateAssessment(invitationToken: string) {
  const response = await api.post(`/candidate/assessment/${invitationToken}/submit`);
  return response.data;
}

export async function fetchCandidateAssessments() {
  const response = await api.get<{ items: AssessmentAttempt[]; pendingInvitations: AssessmentInvitation[] }>("/candidate/my-assessments");
  return response.data;
}

export async function fetchCandidateAssessmentResult(attemptId: string, invitationToken?: string) {
  const response = await api.get<{ attempt: AssessmentAttempt; visibleResult: Record<string, boolean> }>(
    `/candidate/assessment-results/${attemptId}`,
    invitationToken
      ? {
          headers: { "x-invitation-token": invitationToken },
        }
      : undefined,
  );
  return response.data;
}

export async function fetchCandidateAttemptTestContext(attemptId: string) {
  const response = await api.get<{ attempt: AssessmentAttempt; assessment: Assessment; warning: string }>(`/candidate/assessments/${attemptId}/test-context`);
  return response.data;
}

export async function saveCandidateAttemptAnswer(attemptId: string, payload: Record<string, unknown>) {
  const response = await api.post(`/candidate/assessments/${attemptId}/save-answer`, payload);
  return response.data;
}

export async function submitCandidateAttemptAssessment(attemptId: string) {
  const response = await api.post(`/candidate/assessments/${attemptId}/submit`);
  return response.data;
}

export async function fetchCandidateIdentityStatus(attemptId: string) {
  const response = await api.get<{
    verification: CandidateIdentityVerification;
    summary: Record<string, unknown>;
    events: IdentityVerificationEvent[];
    alternativeRequests: AlternativeVerificationRequest[];
    warning: string;
  }>(`/candidate/assessments/${attemptId}/identity/status`);
  return response.data;
}

export async function acceptCandidateIdentityConsent(attemptId: string) {
  const response = await api.post<{ verification: CandidateIdentityVerification }>(`/candidate/assessments/${attemptId}/identity/consent`);
  return response.data.verification;
}

export async function submitCandidateIdentitySystemCheck(attemptId: string, payload: Record<string, unknown>) {
  const response = await api.post<{ verification: CandidateIdentityVerification; passed: boolean }>(`/candidate/assessments/${attemptId}/identity/system-check`, payload);
  return response.data;
}

export async function captureCandidateIdentityAngle(attemptId: string, angle: "front" | "left" | "right", image: CandidateVerificationImage) {
  const response = await api.post<{ verification: CandidateIdentityVerification }>(`/candidate/assessments/${attemptId}/identity/capture-${angle}`, { image });
  return response.data.verification;
}

export async function completeCandidateIdentityLiveness(attemptId: string, payload: { required?: boolean; status: string; challengeType?: string; failedReason?: string }) {
  const response = await api.post<{ verification: CandidateIdentityVerification }>(`/candidate/assessments/${attemptId}/identity/liveness`, payload);
  return response.data.verification;
}

export async function completeCandidateIdentityVerification(attemptId: string) {
  const response = await api.post<{ verification: CandidateIdentityVerification }>(`/candidate/assessments/${attemptId}/identity/complete`);
  return response.data.verification;
}

export async function recordCandidateIdentityEvent(attemptId: string, payload: { eventType: string; source?: string; confidence?: number; severity?: string; metadata?: Record<string, unknown> }) {
  const response = await api.post<{ event: IdentityVerificationEvent }>(`/candidate/assessments/${attemptId}/identity/event`, payload);
  return response.data.event;
}

export async function requestCandidateAlternativeVerification(attemptId: string, payload: { reasonCategory: string; explanation: string; supportingNote?: string }) {
  const response = await api.post<{ request: AlternativeVerificationRequest; verification: CandidateIdentityVerification }>(`/candidate/assessments/${attemptId}/identity/alternative-request`, payload);
  return response.data;
}

export async function submitCandidateIdentityExplanation(attemptId: string, payload: { category: string; explanation: string }) {
  const response = await api.post<{ verification: CandidateIdentityVerification }>(`/candidate/assessments/${attemptId}/identity/explanation`, payload);
  return response.data.verification;
}

export async function fetchAdminIdentityVerificationEvents(params?: Record<string, string>) {
  const response = await api.get<{ warning: string; items: IdentityVerificationEvent[] }>("/admin/identity-verification/events", { params });
  return response.data;
}

export async function fetchAdminAlternativeVerificationRequests() {
  const response = await api.get<{ items: AlternativeVerificationRequest[] }>("/admin/identity-verification/alternative-requests");
  return response.data.items;
}

export async function reviewAdminAlternativeVerificationRequest(requestId: string, payload: { status: string; reviewerNote?: string }) {
  const response = await api.patch<{ request: AlternativeVerificationRequest }>(`/admin/identity-verification/alternative-requests/${requestId}/review`, payload);
  return response.data.request;
}

export async function fetchPublicSubscriptionPlans() {
  const response = await api.get<{ plans: SubscriptionPlan[] }>("/public/subscription-plans");
  return response.data.plans;
}

export async function fetchSubscriptionOverview() {
  const response = await api.get<{ subscription: SubscriptionRecord; billingProfile: any; paymentMethods: PaymentMethodRecord[] }>(
    "/recruiter/subscription",
  );
  return response.data;
}

export async function fetchSubscriptionPlans() {
  const response = await api.get<{ plans: SubscriptionPlan[] }>("/recruiter/subscription/plans");
  return response.data.plans;
}

export async function fetchSubscriptionUsage() {
  const response = await api.get<{ usage: UsageOverview[]; credits: any[] }>("/recruiter/subscription/usage");
  return response.data;
}

export async function createSubscriptionCheckout(payload: Record<string, unknown>) {
  const response = await api.post("/recruiter/subscription/checkout", payload);
  return response.data;
}

export async function verifySubscriptionPayment(payload: { checkoutId: string }) {
  const response = await api.post("/recruiter/subscription/verify-payment", payload);
  return response.data;
}

export async function upgradeSubscription(payload: { planCode: string; billingCycle?: string }) {
  const response = await api.post("/recruiter/subscription/upgrade", payload);
  return response.data;
}

export async function downgradeSubscription(payload: { planCode: string; billingCycle?: string }) {
  const response = await api.post("/recruiter/subscription/downgrade", payload);
  return response.data;
}

export async function cancelSubscription(payload: { reason: string }) {
  const response = await api.post("/recruiter/subscription/cancel", payload);
  return response.data;
}

export async function reactivateSubscription() {
  const response = await api.post("/recruiter/subscription/reactivate");
  return response.data;
}

export async function pauseSubscription() {
  const response = await api.post("/recruiter/subscription/pause");
  return response.data;
}

export async function fetchPaymentMethods() {
  const response = await api.get<{ items: PaymentMethodRecord[] }>("/recruiter/subscription/payment-methods");
  return response.data.items;
}

export async function createPaymentMethod(payload: Record<string, unknown>) {
  const response = await api.post("/recruiter/subscription/payment-methods", payload);
  return response.data;
}

export async function setDefaultPaymentMethod(paymentMethodId: string) {
  const response = await api.patch(`/recruiter/subscription/payment-methods/${paymentMethodId}/default`);
  return response.data;
}

export async function deletePaymentMethodRecord(paymentMethodId: string) {
  const response = await api.delete(`/recruiter/subscription/payment-methods/${paymentMethodId}`);
  return response.data;
}

export async function fetchInvoices(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<PaginatedResponse<InvoiceRecord>>("/recruiter/subscription/invoices", { params });
  return response.data;
}

export async function fetchInvoice(invoiceId: string) {
  const response = await api.get<{ invoice: InvoiceRecord }>(`/recruiter/subscription/invoices/${invoiceId}`);
  return response.data.invoice;
}

export async function fetchCredits() {
  const response = await api.get("/recruiter/subscription/credits");
  return response.data;
}

export async function purchaseCredits(payload: { creditType: string; quantity: number }) {
  const response = await api.post("/recruiter/subscription/credits/purchase", payload);
  return response.data;
}

export async function validateSubscriptionCoupon(payload: { code: string; planCode?: string; amount?: number }) {
  const response = await api.post("/recruiter/subscription/coupons/validate", payload);
  return response.data;
}

export async function fetchCandidateDashboard() {
  const response = await api.get<CandidateDashboardResponse>("/candidate/dashboard");
  return response.data;
}

export async function fetchCandidateProfile() {
  const response = await api.get<{ candidate: Candidate; profileCompletion: number; missingFields: string[] }>("/candidate/profile");
  return response.data;
}

export async function updateCandidateProfileDetails(payload: Partial<Candidate>) {
  const response = await api.put<{ candidate: Candidate; profileCompletion: number; missingFields: string[] }>("/candidate/profile", payload);
  return response.data;
}

export async function fetchCandidateResumes() {
  const response = await api.get<{ items: ResumeRecord[] }>("/candidate/resumes");
  return response.data.items;
}

export async function uploadCandidateResumeVersion(file: File) {
  const formData = new FormData();
  formData.append("resume", file);
  const response = await api.post<{ resume: ResumeRecord }>("/candidate/resumes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.resume;
}

export async function fetchCandidateResume(resumeId: string) {
  const response = await api.get<{ resume: ResumeRecord }>(`/candidate/resumes/${resumeId}`);
  return response.data.resume;
}

export async function deleteCandidateResume(resumeId: string) {
  const response = await api.delete<{ message: string }>(`/candidate/resumes/${resumeId}`);
  return response.data.message;
}

export async function setDefaultCandidateResume(resumeId: string) {
  const response = await api.patch<{ resume: ResumeRecord }>(`/candidate/resumes/${resumeId}/default`);
  return response.data.resume;
}

export async function analyzeCandidateResume(resumeId: string) {
  const response = await api.post<{ analysis: ResumeRecord["analysis"]; resume: ResumeRecord }>(`/candidate/resumes/${resumeId}/analyze`);
  return response.data;
}

export async function confirmCandidateResumeExtractedData(
  resumeId: string,
  payload: { confirmedData: Record<string, any>; applyToProfile?: boolean },
) {
  const response = await api.put<{ resume: ResumeRecord; candidate: Candidate }>(`/candidate/resumes/${resumeId}/confirm-extracted-data`, payload);
  return response.data;
}

export async function fetchCandidateSkillPassport() {
  const response = await api.get<{ passport: SkillPassport }>("/candidate/skill-passport");
  return response.data.passport;
}

export async function updateCandidateSkillPassportSkills(confirmedSkills: SkillPassport["confirmedSkills"]) {
  const response = await api.put<{ passport: SkillPassport }>("/candidate/skill-passport/skills", { confirmedSkills });
  return response.data.passport;
}

export async function startCandidateStandardSkillTest() {
  const response = await api.post<{ passport: SkillPassport }>("/candidate/skill-passport/start-standard-test");
  return response.data.passport;
}

export type CandidateVerificationImage = {
  imageData: string;
  signature: number[];
  metrics: {
    brightness: number;
    contrast: number;
    edgeScore: number;
    cameraCovered?: boolean;
    faceCenterX?: number;
    faceSymmetry?: number;
    faceVisible?: boolean;
    frozenFrame?: boolean;
    horizontalBalance?: number;
    onlyOneFaceVisible?: boolean;
    reviewSignals?: string[];
  };
};

export async function submitCandidateSkillIdentityVerification(photos: Record<"front" | "left" | "right", CandidateVerificationImage>) {
  const response = await api.post<{ passport: SkillPassport }>("/candidate/skill-passport/identity-verification", { photos });
  return response.data.passport;
}

export async function retakeCandidateSkillVerificationPhoto(angle: "front" | "left" | "right", image: CandidateVerificationImage) {
  const response = await api.patch<{ passport: SkillPassport }>(`/candidate/skill-passport/identity-verification/${angle}`, { image });
  return response.data.passport;
}

export async function recordCandidateSkillProctoringCheck(image: CandidateVerificationImage) {
  const response = await api.post<{ check: NonNullable<SkillPassport["identityVerification"]>["lastCheck"] }>("/candidate/skill-passport/proctoring-check", { image });
  return response.data.check;
}

export async function submitCandidateStandardSkillTest(answers: Record<string, string[]>, identityCheckImage: CandidateVerificationImage) {
  const response = await api.post<{ passport: SkillPassport }>("/candidate/skill-passport/submit-standard-test", { answers, identityCheckImage });
  return response.data.passport;
}

export async function fetchCandidateTalentInvitations() {
  const response = await api.get<{ items: TalentInvitation[] }>("/candidate/skill-passport/invitations");
  return response.data.items;
}

export async function respondToTalentInvitation(invitationId: string, response: "Accepted" | "Rejected") {
  const result = await api.patch<{ message: string }>(`/candidate/skill-passport/invitations/${invitationId}/respond`, { response });
  return result.data.message;
}

export async function fetchPublicJobs(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<PaginatedResponse<Job>>("/public/jobs", { params });
  return response.data;
}

export async function fetchPublicJob(jobId: string) {
  const response = await api.get<{ job: Job; assessmentSummary?: Record<string, unknown> | null }>(`/public/jobs/${jobId}`);
  return response.data;
}

export async function fetchCandidateJobMatch(jobId: string) {
  const response = await api.get<{ match: MatchAnalysis }>(`/candidate/jobs/${jobId}/match`);
  return response.data.match;
}

export async function fetchPublicCompany(companyId: string) {
  const response = await api.get<{ company: Company; activeJobCount: number }>(`/public/companies/${companyId}`);
  return response.data;
}

export async function fetchPublicCompanyJobs(companyId: string) {
  const response = await api.get<{ company: Company; jobs: Job[] }>(`/public/companies/${companyId}/jobs`);
  return response.data;
}

export async function createCandidateApplication(jobId: string, payload: { coverLetter?: string; screeningAnswers?: Array<{ question: string; answer: string }> }) {
  const response = await api.post<{ application: ApplicationRecord }>(`/candidate/jobs/${jobId}/applications`, payload);
  return response.data.application;
}

export async function createCandidateApplicationDraft(jobId: string, payload: { coverLetter?: string; screeningAnswers?: Array<{ question: string; answer: string }> }) {
  const response = await api.post<{ application: ApplicationRecord }>(`/candidate/jobs/${jobId}/applications/draft`, payload);
  return response.data.application;
}

export async function fetchCandidateApplications(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<CandidateApplicationsResponse>("/candidate/applications", { params });
  return response.data;
}

export async function fetchCandidateApplication(applicationId: string) {
  const response = await api.get<{
    application: ApplicationRecord;
    interviews: Interview[];
    assessmentInvitations: AssessmentInvitation[];
    timeline: Array<{ label: string; at: string }>;
  }>(`/candidate/applications/${applicationId}`);
  return response.data;
}

export async function fetchCandidateApplicationResumeFile(applicationId: string) {
  const response = await api.get<Blob>(`/candidate/applications/${applicationId}/resume/file`, {
    responseType: "blob",
  });
  return response.data;
}

export async function updateCandidateApplicationDraft(
  applicationId: string,
  payload: { coverLetter?: string; screeningAnswers?: Array<{ question: string; answer: string }> },
) {
  const response = await api.put<{ application: ApplicationRecord }>(`/candidate/applications/${applicationId}`, payload);
  return response.data.application;
}

export async function submitCandidateApplication(applicationId: string) {
  const response = await api.post<{ application: ApplicationRecord }>(`/candidate/applications/${applicationId}/submit`);
  return response.data.application;
}

export async function withdrawCandidateApplication(applicationId: string) {
  const response = await api.patch<{ application: ApplicationRecord }>(`/candidate/applications/${applicationId}/withdraw`);
  return response.data.application;
}

export async function fetchCandidateInterviews(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<CandidateInterviewsResponse>("/candidate/interviews", { params });
  return response.data;
}

export async function fetchCandidateInterview(interviewId: string) {
  const response = await api.get<{ interview: Interview }>(`/candidate/interviews/${interviewId}`);
  return response.data.interview;
}

export async function confirmCandidateInterview(interviewId: string) {
  const response = await api.patch<{ interview: Interview }>(`/candidate/interviews/${interviewId}/confirm`);
  return response.data.interview;
}

export async function requestCandidateInterviewReschedule(
  interviewId: string,
  payload: { reason: string; preferredDates: string[]; preferredTimeRanges: string[]; additionalNote?: string },
) {
  const response = await api.post<{ interview: Interview }>(`/candidate/interviews/${interviewId}/reschedule-request`, payload);
  return response.data.interview;
}

export async function downloadCandidateInterviewCalendarInvite(interviewId: string) {
  const response = await api.post(`/candidate/interviews/${interviewId}/add-to-calendar`, undefined, {
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function fetchSavedJobs() {
  const response = await api.get<{ items: SavedJobRecord[] }>("/candidate/saved-jobs");
  return response.data.items;
}

export async function saveCandidateJob(jobId: string) {
  const response = await api.post(`/candidate/saved-jobs/${jobId}`);
  return response.data;
}

export async function removeCandidateSavedJob(jobId: string) {
  const response = await api.delete(`/candidate/saved-jobs/${jobId}`);
  return response.data;
}

export async function fetchCandidateNotifications(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<PaginatedResponse<CandidateNotification>>("/candidate/notifications", { params });
  return response.data;
}

export async function markCandidateNotificationRead(notificationId: string) {
  const response = await api.patch(`/candidate/notifications/${notificationId}/read`);
  return response.data;
}

export async function markCandidateNotificationUnread(notificationId: string) {
  const response = await api.patch(`/candidate/notifications/${notificationId}/unread`);
  return response.data;
}

export async function markAllCandidateNotificationsRead() {
  const response = await api.patch("/candidate/notifications/read-all");
  return response.data;
}

export async function deleteCandidateNotification(notificationId: string) {
  const response = await api.delete(`/candidate/notifications/${notificationId}`);
  return response.data;
}

export async function deleteCandidateReadNotifications() {
  const response = await api.delete("/candidate/notifications/read");
  return response.data;
}

export async function fetchCandidatePrivacy() {
  const response = await api.get<{ privacy: CandidatePrivacySettings }>("/candidate/privacy");
  return response.data.privacy;
}

export async function updateCandidatePrivacy(payload: CandidatePrivacySettings) {
  const response = await api.put<{ privacy: CandidatePrivacySettings }>("/candidate/privacy", payload);
  return response.data.privacy;
}

export async function exportCandidateData() {
  const response = await api.post("/candidate/privacy/data-export");
  return response.data;
}

export async function deactivateCandidateAccount(payload: { password: string }) {
  const response = await api.post<{ message: string; logoutRequired: boolean }>("/candidate/privacy/deactivate-account", payload);
  return response.data;
}

export async function deleteCandidateAccount(payload: { password: string; confirmationText: "DELETE" }) {
  const response = await api.post<{ message: string; logoutRequired: boolean }>("/candidate/privacy/delete-account", payload);
  return response.data;
}

export async function fetchCandidateSecuritySessions() {
  const response = await api.get<{ items: CandidateSecuritySession[] }>("/candidate/security/sessions");
  return response.data.items;
}

export async function deleteCandidateSecuritySession(sessionId: string) {
  const response = await api.delete<{ message: string; logoutRequired: boolean }>(`/candidate/security/sessions/${sessionId}`);
  return response.data;
}

export async function deleteOtherCandidateSecuritySessions() {
  const response = await api.delete<{ message: string; revokedSessions: number }>("/candidate/security/sessions/others");
  return response.data;
}
