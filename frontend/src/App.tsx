import { Navigate, Route, Routes } from "react-router-dom";
import { CandidateLayout } from "./components/layout/CandidateLayout";
import { RecruiterLayout } from "./components/layout/RecruiterLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleHomeRedirect } from "./routes/RoleHomeRedirect";
import { AdminResumeSecurityPage } from "./pages/admin/AdminResumeSecurityPage";
import { AssessmentIntroPage } from "./pages/candidate/AssessmentIntroPage";
import { AssessmentInstructionsPage } from "./pages/candidate/AssessmentInstructionsPage";
import { AssessmentProfileReviewPage } from "./pages/candidate/AssessmentProfileReviewPage";
import { AssessmentResumePage } from "./pages/candidate/AssessmentResumePage";
import { AssessmentSubmittedPage } from "./pages/candidate/AssessmentSubmittedPage";
import { CandidateApplicationDetailsPage } from "./pages/candidate/CandidateApplicationDetailsPage";
import { CandidateAssessmentAttemptTestPage } from "./pages/candidate/CandidateAssessmentAttemptTestPage";
import { AssessmentSystemCheckPage } from "./pages/candidate/AssessmentSystemCheckPage";
import { AssessmentTestPage } from "./pages/candidate/AssessmentTestPage";
import { AssessmentVerifyPage } from "./pages/candidate/AssessmentVerifyPage";
import { CandidateAssessmentResultPage } from "./pages/candidate/CandidateAssessmentResultPage";
import { CandidateApplicationsPage } from "./pages/candidate/CandidateApplicationsPage";
import { CandidateAssessmentsPage } from "./pages/candidate/CandidateAssessmentsPage";
import { CandidateDashboardPage } from "./pages/candidate/CandidateDashboardPage";
import { CandidateIdentityVerificationFlowPage } from "./pages/candidate/CandidateIdentityVerificationFlowPage";
import { CandidateInterviewsPage } from "./pages/candidate/CandidateInterviewsPage";
import { CandidateNotificationsPage } from "./pages/candidate/CandidateNotificationsPage";
import { CandidatePrivacyPage } from "./pages/candidate/CandidatePrivacyPage";
import { CandidateProfilePage } from "./pages/candidate/CandidateProfilePage";
import { CandidateResumePage } from "./pages/candidate/CandidateResumePage";
import { CandidateSkillPassportPage } from "./pages/candidate/CandidateSkillPassportPage";
import { CandidateSkillResultPage } from "./pages/candidate/CandidateSkillResultPage";
import { CandidateSkillTestPage } from "./pages/candidate/CandidateSkillTestPage";
import { ApplicantDetailsPage } from "./pages/recruiter/ApplicantDetailsPage";
import { ApplicantsPage } from "./pages/recruiter/ApplicantsPage";
import { AssessmentBuilderPage } from "./pages/recruiter/AssessmentBuilderPage";
import { AssessmentDetailsPage } from "./pages/recruiter/AssessmentDetailsPage";
import { AssessmentInvitationsPage } from "./pages/recruiter/AssessmentInvitationsPage";
import { AssessmentPreviewPage } from "./pages/recruiter/AssessmentPreviewPage";
import { AssessmentResultDetailPage } from "./pages/recruiter/AssessmentResultDetailPage";
import { AssessmentResultsPage } from "./pages/recruiter/AssessmentResultsPage";
import { AssessmentsPage } from "./pages/recruiter/AssessmentsPage";
import { CompanyProfilePage } from "./pages/recruiter/CompanyProfilePage";
import { DashboardPage } from "./pages/recruiter/DashboardPage";
import { EditJobPage } from "./pages/recruiter/EditJobPage";
import { InterviewsPage } from "./pages/recruiter/InterviewsPage";
import { InvoicesPage } from "./pages/recruiter/InvoicesPage";
import { IdentityReportPage } from "./pages/recruiter/IdentityReportPage";
import { JobDetailsPage } from "./pages/recruiter/JobDetailsPage";
import { JobsBrowsePage } from "./pages/JobsBrowsePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { PublicCompanyDetailsPage } from "./pages/PublicCompanyDetailsPage";
import { PublicJobDetailsPage } from "./pages/PublicJobDetailsPage";
import { ManageJobsPage } from "./pages/recruiter/ManageJobsPage";
import { PaymentMethodsPage } from "./pages/recruiter/PaymentMethodsPage";
import { PostJobPage } from "./pages/recruiter/PostJobPage";
import { PricingPage } from "./pages/PricingPage";
import { QuestionBankPage } from "./pages/recruiter/QuestionBankPage";
import { ShortlistedPage } from "./pages/recruiter/ShortlistedPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { SubscriptionOverviewPage } from "./pages/recruiter/SubscriptionOverviewPage";
import { SubscriptionUsagePage } from "./pages/recruiter/SubscriptionUsagePage";
import { TalentPoolPage } from "./pages/recruiter/TalentPoolPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/jobs" element={<JobsBrowsePage />} />
      <Route path="/jobs/:jobId" element={<PublicJobDetailsPage />} />
      <Route path="/companies/:companyId" element={<PublicCompanyDetailsPage />} />
      <Route path="/assessment/:invitationToken" element={<AssessmentIntroPage />} />
      <Route path="/assessment/:invitationToken/verify" element={<AssessmentVerifyPage />} />
      <Route path="/assessment/:invitationToken/resume" element={<AssessmentResumePage />} />
      <Route path="/assessment/:invitationToken/profile-review" element={<AssessmentProfileReviewPage />} />
      <Route path="/assessment/:invitationToken/system-check" element={<AssessmentSystemCheckPage />} />
      <Route path="/assessment/:invitationToken/instructions" element={<AssessmentInstructionsPage />} />
      <Route path="/assessment/:invitationToken/test" element={<AssessmentTestPage />} />
      <Route path="/assessment/:invitationToken/submitted" element={<AssessmentSubmittedPage />} />
      <Route path="/" element={<RoleHomeRedirect />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<RecruiterLayout />}>
          <Route path="/recruiter/dashboard" element={<DashboardPage />} />
          <Route path="/recruiter/company" element={<CompanyProfilePage />} />
          <Route path="/recruiter/jobs/create" element={<PostJobPage />} />
          <Route path="/recruiter/jobs" element={<ManageJobsPage />} />
          <Route path="/recruiter/jobs/:jobId" element={<JobDetailsPage />} />
          <Route path="/recruiter/jobs/:jobId/edit" element={<EditJobPage />} />
          <Route path="/recruiter/assessments" element={<AssessmentsPage />} />
          <Route path="/recruiter/assessments/create" element={<AssessmentBuilderPage />} />
          <Route path="/recruiter/assessments/:assessmentId" element={<AssessmentDetailsPage />} />
          <Route path="/recruiter/assessments/:assessmentId/edit" element={<AssessmentBuilderPage />} />
          <Route path="/recruiter/assessments/:assessmentId/preview" element={<AssessmentPreviewPage />} />
          <Route path="/recruiter/assessments/:assessmentId/invitations" element={<AssessmentInvitationsPage />} />
          <Route path="/recruiter/assessments/:assessmentId/results" element={<AssessmentResultsPage />} />
          <Route path="/recruiter/assessment-results/:attemptId" element={<AssessmentResultDetailPage />} />
          <Route path="/recruiter/assessment-results/:attemptId/identity-report" element={<IdentityReportPage />} />
          <Route path="/recruiter/assessment-results/:attemptId/integrity-report" element={<AssessmentResultDetailPage />} />
          <Route path="/recruiter/question-bank" element={<QuestionBankPage />} />
          <Route path="/recruiter/applicants" element={<ApplicantsPage />} />
          <Route path="/recruiter/talent-pool" element={<TalentPoolPage />} />
          <Route path="/recruiter/applicants/:applicationId" element={<ApplicantDetailsPage />} />
          <Route path="/recruiter/shortlisted" element={<ShortlistedPage />} />
          <Route path="/recruiter/interviews" element={<InterviewsPage />} />
          <Route path="/recruiter/subscription" element={<SubscriptionOverviewPage />} />
          <Route path="/recruiter/subscription/usage" element={<SubscriptionUsagePage />} />
          <Route path="/recruiter/subscription/payment-methods" element={<PaymentMethodsPage />} />
          <Route path="/recruiter/subscription/invoices" element={<InvoicesPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="candidate" />}>
        <Route element={<CandidateLayout />}>
          <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />
          <Route path="/candidate/profile" element={<CandidateProfilePage />} />
          <Route path="/candidate/resume" element={<CandidateResumePage />} />
          <Route path="/candidate/resume/skill-passport" element={<CandidateSkillPassportPage />} />
          <Route path="/candidate/resume/skill-passport/test" element={<CandidateSkillTestPage />} />
          <Route path="/candidate/skill-result" element={<CandidateSkillResultPage />} />
          <Route path="/candidate/resume/skill-passport/result" element={<Navigate to="/candidate/skill-result" replace />} />
          <Route path="/candidate/skill-passport" element={<Navigate to="/candidate/resume/skill-passport" replace />} />
          <Route path="/candidate/skill-passport/test" element={<Navigate to="/candidate/resume/skill-passport/test" replace />} />
          <Route path="/candidate/skill-passport/result" element={<Navigate to="/candidate/skill-result" replace />} />
          <Route path="/candidate/applications" element={<CandidateApplicationsPage />} />
          <Route path="/candidate/applications/:applicationId" element={<CandidateApplicationDetailsPage />} />
          <Route path="/candidate/assessments" element={<CandidateAssessmentsPage />} />
          <Route path="/candidate/assessments/:attemptId/identity/notice" element={<CandidateIdentityVerificationFlowPage step="notice" />} />
          <Route path="/candidate/assessments/:attemptId/identity/consent" element={<CandidateIdentityVerificationFlowPage step="consent" />} />
          <Route path="/candidate/assessments/:attemptId/identity/system-check" element={<CandidateIdentityVerificationFlowPage step="system-check" />} />
          <Route path="/candidate/assessments/:attemptId/identity/capture" element={<CandidateIdentityVerificationFlowPage step="capture" />} />
          <Route path="/candidate/assessments/:attemptId/identity/liveness" element={<CandidateIdentityVerificationFlowPage step="liveness" />} />
          <Route path="/candidate/assessments/:attemptId/identity/complete" element={<CandidateIdentityVerificationFlowPage step="complete" />} />
          <Route path="/candidate/assessments/:attemptId/test" element={<CandidateAssessmentAttemptTestPage />} />
          <Route path="/candidate/assessments/:attemptId/submitted" element={<CandidateIdentityVerificationFlowPage step="submitted" />} />
          <Route path="/candidate/assessments/:attemptId" element={<CandidateAssessmentResultPage />} />
          <Route path="/candidate/assessments/:attemptId/result" element={<CandidateAssessmentResultPage />} />
          <Route path="/candidate/assessment-results/:attemptId" element={<CandidateAssessmentResultPage />} />
          <Route path="/candidate/interviews" element={<CandidateInterviewsPage />} />
          <Route path="/candidate/notifications" element={<CandidateNotificationsPage />} />
          <Route path="/candidate/privacy" element={<CandidatePrivacyPage />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin/resume-security" element={<AdminResumeSecurityPage />} />
      </Route>
    </Routes>
  );
}
