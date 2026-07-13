import { CandidatePrivacySettings } from "../models/CandidatePrivacySettings.js";

export async function canRecruiterAccessCandidateResume({ candidateId, recruiterId, companyId }) {
  const privacy = await CandidatePrivacySettings.findOne({ candidateId });
  if (!privacy) {
    return true;
  }

  const blockedRecruiters = (privacy.recruiterDiscovery?.blockedRecruiters || []).map(String);
  const blockedOrganizations = (privacy.recruiterDiscovery?.blockedOrganizations || []).map(String);
  if (blockedRecruiters.includes(String(recruiterId)) || blockedOrganizations.includes(String(companyId))) {
    return false;
  }

  return privacy.resumeVisibility !== "Private" || privacy.profileVisibility === "Visible only to companies I apply to";
}

export async function canRecruiterDiscoverCandidate({ candidateId, recruiterId, companyId }) {
  const privacy = await CandidatePrivacySettings.findOne({ candidateId });
  if (!privacy) {
    return true;
  }

  const blockedRecruiters = (privacy.recruiterDiscovery?.blockedRecruiters || []).map(String);
  const blockedOrganizations = (privacy.recruiterDiscovery?.blockedOrganizations || []).map(String);
  if (blockedRecruiters.includes(String(recruiterId)) || blockedOrganizations.includes(String(companyId))) {
    return false;
  }

  return Boolean(
    privacy.recruiterDiscovery?.discoverableByVerifiedRecruiters &&
      privacy.recruiterDiscovery?.recruitersCanSendOpportunities &&
      privacy.skillPassportVisibility !== "Private",
  );
}
