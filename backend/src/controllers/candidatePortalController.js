import fs from "fs";
import { analyzeCandidateMatch } from "../services/aiService.js";
import { Application } from "../models/Application.js";
import { AssessmentAttempt } from "../models/AssessmentAttempt.js";
import { AssessmentInvitation } from "../models/AssessmentInvitation.js";
import { Candidate } from "../models/Candidate.js";
import { CandidatePrivacySettings } from "../models/CandidatePrivacySettings.js";
import { Interview } from "../models/Interview.js";
import { Job } from "../models/Job.js";
import { Notification } from "../models/Notification.js";
import { SavedJob } from "../models/SavedJob.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildPaginatedResponse, getPagination } from "../utils/pagination.js";
import { resolveStoredResumePath } from "../utils/resumeStorage.js";

function computeProfileCompletion(candidate) {
  const checks = [
    Boolean(candidate.name),
    Boolean(candidate.professionalTitle),
    Boolean(candidate.summary),
    Boolean(candidate.phone),
    Boolean(candidate.location || candidate.city || candidate.country),
    (candidate.skills || []).length > 0,
    (candidate.education || []).length > 0,
    (candidate.experience || []).length > 0,
    (candidate.projects || []).length > 0,
    (candidate.certifications || []).length > 0,
    Boolean(candidate.resumeUrl),
    (candidate.jobPreferences?.preferredRoles || []).length > 0,
    Boolean(candidate.socialLinks?.linkedin || candidate.socialLinks?.github || candidate.socialLinks?.portfolio),
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function getProfileMissingFields(candidate) {
  const missing = [];
  if (!candidate.name) missing.push("Basic information");
  if (!candidate.professionalTitle) missing.push("Professional title");
  if (!candidate.summary) missing.push("Professional summary");
  if ((candidate.skills || []).length === 0) missing.push("Skills");
  if ((candidate.education || []).length === 0) missing.push("Education");
  if ((candidate.experience || []).length === 0) missing.push("Experience");
  if ((candidate.projects || []).length === 0) missing.push("Projects");
  if ((candidate.certifications || []).length === 0) missing.push("Certifications");
  if (!candidate.resumeUrl) missing.push("Resume");
  if ((candidate.jobPreferences?.preferredRoles || []).length === 0) missing.push("Job preferences");
  if (!candidate.socialLinks?.linkedin && !candidate.socialLinks?.github && !candidate.socialLinks?.portfolio) missing.push("Social links");
  return missing;
}

async function getCandidateRecord(candidateId) {
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) {
    throw new ApiError(404, "Candidate profile not found");
  }
  return candidate;
}

function activePublishedJobFilter() {
  return {
    status: "Published",
    deletedAt: null,
    $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
  };
}

function mapJobWithCompany(job) {
  if (!job) {
    return null;
  }

  const rawJob = typeof job.toObject === "function" ? job.toObject() : job;
  return {
    ...rawJob,
    company: rawJob.companyId || rawJob.company || null,
  };
}

function mapApplicationRecord(application) {
  if (!application) {
    return null;
  }

  const rawApplication = typeof application.toObject === "function" ? application.toObject() : application;
  return {
    ...rawApplication,
    job: mapJobWithCompany(rawApplication.jobId),
  };
}

function mapInterviewRecord(interview) {
  if (!interview) {
    return null;
  }

  const rawInterview = typeof interview.toObject === "function" ? interview.toObject() : interview;
  return {
    ...rawInterview,
    job: mapJobWithCompany(rawInterview.jobId),
  };
}

function buildApplicationTimeline(application, interviews = [], invitations = []) {
  const events = [
    { label: "Application submitted", at: application.appliedAt },
    { label: "Application last updated", at: application.updatedAt },
  ];

  if (application.shortlistedAt) {
    events.push({ label: "Application shortlisted", at: application.shortlistedAt });
  }

  if (application.selectedAt) {
    events.push({ label: "Candidate selected", at: application.selectedAt });
  }

  if (application.rejectedAt) {
    events.push({ label: "Application rejected", at: application.rejectedAt });
  }

  if (application.withdrawnAt) {
    events.push({ label: "Application withdrawn", at: application.withdrawnAt });
  }

  invitations.forEach((invitation) => {
    if (invitation.sentAt) {
      events.push({ label: "Assessment invitation sent", at: invitation.sentAt });
    }
    if (invitation.startedAt) {
      events.push({ label: "Assessment started", at: invitation.startedAt });
    }
    if (invitation.completedAt) {
      events.push({ label: "Assessment completed", at: invitation.completedAt });
    }
  });

  interviews.forEach((interview) => {
    events.push({
      label: interview.status === "Cancelled" ? "Interview cancelled" : "Interview scheduled",
      at: interview.startDateTime,
    });
  });

  return events
    .filter((event) => event.at)
    .sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
}

export const getCandidateDashboard = asyncHandler(async (req, res) => {
  const candidate = await getCandidateRecord(req.user.candidateId);
  candidate.profileCompletion = computeProfileCompletion(candidate);
  await candidate.save();

  const [applications, pendingInvitations, attempts, interviews, savedJobs, notifications, unreadNotifications, jobs] = await Promise.all([
    Application.find({ candidateId: candidate._id }).populate({
      path: "jobId",
      populate: {
        path: "companyId",
      },
    }),
    AssessmentInvitation.find({
      candidateId: candidate._id,
      status: { $in: ["Sent", "Opened", "Resume Submitted", "Started"] },
    })
      .populate("assessmentId")
      .populate("jobId"),
    AssessmentAttempt.find({ candidateId: candidate._id }).populate("assessmentId"),
    Interview.find({ candidateId: candidate._id })
      .populate({
        path: "jobId",
        populate: {
          path: "companyId",
        },
      })
      .sort({ startDateTime: 1 }),
    SavedJob.find({ candidateId: candidate._id }),
    Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(5),
    Notification.countDocuments({ userId: req.user.userId, read: false }),
    Job.find(activePublishedJobFilter()).populate("companyId").sort({ publishedAt: -1 }).limit(12),
  ]);

  const recommendedJobs = jobs
    .map((job) => ({
      job,
      match: analyzeCandidateMatch({ candidate, job }),
    }))
    .sort((left, right) => right.match.overallScore - left.match.overallScore)
    .slice(0, 4)
    .map(({ job, match }) => ({
      ...job.toObject(),
      company: job.companyId,
      match,
      isSaved: savedJobs.some((saved) => saved.jobId.toString() === job._id.toString()),
    }));

  const activeInterviews = interviews.filter((item) => new Date(item.startDateTime) >= new Date() && item.status !== "Cancelled");
  const applicationStatusCounts = applications.reduce((accumulator, item) => {
    accumulator[item.status] = (accumulator[item.status] || 0) + 1;
    return accumulator;
  }, {});

  res.json({
    statistics: {
      profileCompletion: candidate.profileCompletion,
      resumeScore: Math.min(95, 55 + Math.round((candidate.skills.length + candidate.experience.length * 2) * 4)),
      totalApplications: applications.length,
      underReview: applicationStatusCounts["Under Review"] || 0,
      shortlisted: applicationStatusCounts.Shortlisted || 0,
      pendingAssessments: pendingInvitations.length,
      completedAssessments: attempts.filter((item) => item.status === "Submitted").length,
      upcomingInterviews: activeInterviews.length,
      savedJobs: savedJobs.length,
      unreadNotifications,
    },
    profileMissingFields: getProfileMissingFields(candidate),
    recommendedJobs,
    pendingAssessments: pendingInvitations.map((invitation) => ({
      ...invitation.toObject(),
      assessment: invitation.assessmentId,
      job: invitation.jobId,
    })),
    recentApplicationUpdates: applications
      .sort((left, right) => new Date(right.updatedAt || right.appliedAt).getTime() - new Date(left.updatedAt || left.appliedAt).getTime())
      .slice(0, 5),
    upcomingInterviews: activeInterviews.slice(0, 5),
    recentNotifications: notifications,
  });
});

export const getCandidateProfile = asyncHandler(async (req, res) => {
  const candidate = await getCandidateRecord(req.user.candidateId);
  candidate.profileCompletion = computeProfileCompletion(candidate);
  await candidate.save();

  res.json({
    candidate,
    profileCompletion: candidate.profileCompletion,
    missingFields: getProfileMissingFields(candidate),
  });
});

export const updateCandidateProfileDetails = asyncHandler(async (req, res) => {
  const candidate = await getCandidateRecord(req.user.candidateId);
  Object.assign(candidate, req.body);
  candidate.profileCompletion = computeProfileCompletion(candidate);
  await candidate.save();

  res.json({
    candidate,
    profileCompletion: candidate.profileCompletion,
    missingFields: getProfileMissingFields(candidate),
  });
});

export const getSavedJobs = asyncHandler(async (req, res) => {
  const savedJobs = await SavedJob.find({ candidateId: req.user.candidateId })
    .populate({
      path: "jobId",
      populate: {
        path: "companyId",
      },
    })
    .sort({ savedAt: -1 });

  res.json({
    items: savedJobs
      .filter((item) => item.jobId)
      .map((item) => ({
        _id: item._id,
        savedAt: item.savedAt,
        job: item.jobId,
      })),
  });
});

export const saveJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.jobId, ...activePublishedJobFilter() });
  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const savedJob = await SavedJob.findOneAndUpdate(
    { candidateId: req.user.candidateId, jobId: job._id },
    { $setOnInsert: { savedAt: new Date() } },
    { upsert: true, new: true },
  );

  res.status(201).json({ savedJob });
});

export const removeSavedJob = asyncHandler(async (req, res) => {
  const savedJob = await SavedJob.findOneAndDelete({
    candidateId: req.user.candidateId,
    jobId: req.params.jobId,
  });

  if (!savedJob) {
    throw new ApiError(404, "Saved job not found");
  }

  res.json({ message: "Saved job removed successfully." });
});

export const getCandidateJobMatch = asyncHandler(async (req, res) => {
  const [candidate, job] = await Promise.all([
    getCandidateRecord(req.user.candidateId),
    Job.findOne({ _id: req.params.jobId, ...activePublishedJobFilter() }),
  ]);

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  res.json({
    match: analyzeCandidateMatch({ candidate, job }),
  });
});

export const getCandidateApplications = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const applications = await Application.find({ candidateId: req.user.candidateId })
    .populate({
      path: "jobId",
      populate: {
        path: "companyId",
      },
    })
    .sort({ updatedAt: -1 });

  const searchTerm = String(req.query.search || "").trim().toLowerCase();
  const statusFilter = String(req.query.status || "").trim();
  const filtered = applications.filter((application) => {
    const job = application.jobId;
    const company = job?.companyId;
    const matchesSearch =
      !searchTerm ||
      job?.title?.toLowerCase().includes(searchTerm) ||
      company?.name?.toLowerCase().includes(searchTerm);

    const matchesStatus =
      !statusFilter ||
      application.status === statusFilter ||
      (statusFilter === "Active" && !["Selected", "Rejected", "Withdrawn"].includes(application.status));

    return matchesSearch && matchesStatus;
  });

  const sort = req.query.sort || "recentlyUpdated";
  filtered.sort((left, right) => {
    if (sort === "oldest") {
      return new Date(left.appliedAt).getTime() - new Date(right.appliedAt).getTime();
    }
    if (sort === "highestMatch") {
      return (right.matchAnalysis?.overallScore || 0) - (left.matchAnalysis?.overallScore || 0);
    }
    if (sort === "newest") {
      return new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime();
    }
    return new Date(right.updatedAt || right.appliedAt).getTime() - new Date(left.updatedAt || left.appliedAt).getTime();
  });

  const startIndex = (page - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);
  const allAttempts = await AssessmentAttempt.find({ candidateId: req.user.candidateId }).select("status");
  const allInvitations = await AssessmentInvitation.find({ candidateId: req.user.candidateId }).select("status");

  res.json({
    ...buildPaginatedResponse({
      items: items.map(mapApplicationRecord),
      total: filtered.length,
      page,
      limit,
    }),
    summary: {
      totalApplications: applications.length,
      applied: applications.filter((item) => item.status === "Applied").length,
      underReview: applications.filter((item) => item.status === "Under Review").length,
      shortlisted: applications.filter((item) => item.status === "Shortlisted").length,
      interviewScheduled: applications.filter((item) => item.status === "Interview Scheduled").length,
      selected: applications.filter((item) => item.status === "Selected").length,
      rejected: applications.filter((item) => item.status === "Rejected").length,
      withdrawn: applications.filter((item) => item.status === "Withdrawn").length,
      assessmentPending: allInvitations.filter((item) => ["Sent", "Opened", "Resume Submitted", "Started"].includes(item.status)).length,
      assessmentCompleted: allAttempts.filter((item) => item.status === "Submitted").length,
    },
  });
});

export const getCandidateApplicationById = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    candidateId: req.user.candidateId,
  }).populate({
    path: "jobId",
    populate: {
      path: "companyId",
    },
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  const [interviews, invitations] = await Promise.all([
    Interview.find({ applicationId: application._id, candidateId: req.user.candidateId })
      .populate({
        path: "jobId",
        populate: {
          path: "companyId",
        },
      })
      .sort({ startDateTime: 1 }),
    AssessmentInvitation.find({
      candidateId: req.user.candidateId,
      jobId: application.jobId?._id || application.jobId,
    }).populate("assessmentId"),
  ]);

  res.json({
    application: mapApplicationRecord(application),
    interviews: interviews.map(mapInterviewRecord),
    assessmentInvitations: invitations.map((invitation) => ({
      ...invitation.toObject(),
      assessment: invitation.assessmentId,
    })),
    timeline: buildApplicationTimeline(application, interviews, invitations),
  });
});

export const streamCandidateApplicationResume = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    candidateId: req.user.candidateId,
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  const absolutePath = resolveStoredResumePath(application.resumeUrl);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    throw new ApiError(404, "Resume file not found");
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Cache-Control", "private, max-age=0, no-store");
  res.sendFile(absolutePath);
});

export const createCandidateApplication = asyncHandler(async (req, res) => {
  const [candidate, job] = await Promise.all([
    getCandidateRecord(req.user.candidateId),
    Job.findOne({ _id: req.params.jobId, ...activePublishedJobFilter() }).populate("companyId"),
  ]);

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const existingApplication = await Application.findOne({
    candidateId: candidate._id,
    jobId: job._id,
    status: { $ne: "Withdrawn" },
  });

  if (existingApplication) {
    throw new ApiError(409, "You have already applied for this job");
  }

  if (job.requireResume && !candidate.resumeUrl) {
    throw new ApiError(400, "Please upload your resume before applying");
  }

  const application = await Application.create({
    jobId: job._id,
    candidateId: candidate._id,
    recruiterId: job.recruiterId,
    resumeUrl: candidate.resumeUrl,
    coverLetter: req.body.coverLetter || "",
    screeningAnswers: req.body.screeningAnswers || [],
    matchAnalysis: analyzeCandidateMatch({ candidate, job }),
    status: "Applied",
    appliedAt: new Date(),
  });

  const populatedApplication = await Application.findById(application._id).populate({
    path: "jobId",
    populate: {
      path: "companyId",
    },
  });

  await Notification.create({
    userId: req.user.userId,
    userRole: "candidate",
    category: "Application submitted",
    title: `Application submitted for ${job.title}`,
    message: `Your application to ${job.companyId?.name || "the company"} has been submitted successfully.`,
    relatedEntityType: "application",
    relatedEntityId: application._id.toString(),
    actionUrl: `/candidate/applications/${application._id}`,
    read: false,
  });

  res.status(201).json({
    application: mapApplicationRecord(populatedApplication),
  });
});

export const createCandidateApplicationDraft = asyncHandler(async (req, res) => {
  const [candidate, job] = await Promise.all([
    getCandidateRecord(req.user.candidateId),
    Job.findOne({ _id: req.params.jobId, ...activePublishedJobFilter() }).populate("companyId"),
  ]);

  if (!job) {
    throw new ApiError(404, "Job not found");
  }

  const existingApplication = await Application.findOne({
    candidateId: candidate._id,
    jobId: job._id,
    status: { $in: ["Draft", "Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Selected"] },
  });

  if (existingApplication) {
    throw new ApiError(409, "A draft or submitted application already exists for this job");
  }

  const application = await Application.create({
    jobId: job._id,
    candidateId: candidate._id,
    recruiterId: job.recruiterId,
    resumeUrl: candidate.resumeUrl || "",
    coverLetter: req.body.coverLetter || "",
    screeningAnswers: req.body.screeningAnswers || [],
    status: "Draft",
    appliedAt: null,
    matchAnalysis: analyzeCandidateMatch({ candidate, job }),
  });

  const populatedApplication = await Application.findById(application._id).populate({
    path: "jobId",
    populate: {
      path: "companyId",
    },
  });

  res.status(201).json({
    application: mapApplicationRecord(populatedApplication),
  });
});

export const updateCandidateApplicationDraft = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    candidateId: req.user.candidateId,
    status: "Draft",
  }).populate({
    path: "jobId",
    populate: {
      path: "companyId",
    },
  });

  if (!application) {
    throw new ApiError(404, "Draft application not found");
  }

  application.coverLetter = req.body.coverLetter || application.coverLetter || "";
  application.screeningAnswers = req.body.screeningAnswers || application.screeningAnswers;
  await application.save();

  res.json({
    application: mapApplicationRecord(application),
  });
});

export const submitCandidateApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    candidateId: req.user.candidateId,
  }).populate({
    path: "jobId",
    populate: {
      path: "companyId",
    },
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  if (application.status !== "Draft") {
    throw new ApiError(400, "Only draft applications can be submitted");
  }

  const candidate = await getCandidateRecord(req.user.candidateId);
  if (application.jobId.requireResume && !candidate.resumeUrl) {
    throw new ApiError(400, "Please upload your resume before submitting this application");
  }

  application.status = "Applied";
  application.resumeUrl = candidate.resumeUrl || application.resumeUrl;
  application.appliedAt = new Date();
  application.matchAnalysis = analyzeCandidateMatch({ candidate, job: application.jobId });
  await application.save();

  await Notification.create({
    userId: req.user.userId,
    userRole: "candidate",
    category: "Application submitted",
    title: `Application submitted for ${application.jobId.title}`,
    message: `Your application to ${application.jobId.companyId?.name || "the company"} has been submitted successfully.`,
    relatedEntityType: "application",
    relatedEntityId: application._id.toString(),
    actionUrl: `/candidate/applications/${application._id}`,
    read: false,
  });

  res.json({
    application: mapApplicationRecord(application),
  });
});

export const withdrawCandidateApplication = asyncHandler(async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.applicationId,
    candidateId: req.user.candidateId,
  });

  if (!application) {
    throw new ApiError(404, "Application not found");
  }

  if (application.status === "Selected") {
    throw new ApiError(400, "Selected applications cannot be withdrawn");
  }

  if (application.status === "Withdrawn") {
    throw new ApiError(400, "Application is already withdrawn");
  }

  application.status = "Withdrawn";
  application.withdrawnAt = new Date();
  await application.save();

  res.json({
    application,
  });
});

export const getCandidateInterviews = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const interviews = await Interview.find({ candidateId: req.user.candidateId })
    .populate({
      path: "jobId",
      populate: {
        path: "companyId",
      },
    })
    .populate("applicationId")
    .sort({ startDateTime: 1 });

  const now = Date.now();
  const summary = {
    upcoming: interviews.filter((item) => new Date(item.startDateTime).getTime() >= now && item.status !== "Cancelled").length,
    completed: interviews.filter((item) => item.status === "Completed").length,
    cancelled: interviews.filter((item) => item.status === "Cancelled").length,
    total: interviews.length,
  };

  const tab = String(req.query.tab || "all").toLowerCase();
  const filtered = interviews.filter((item) => {
    if (tab === "upcoming") {
      return new Date(item.startDateTime).getTime() >= now && item.status !== "Cancelled";
    }
    if (tab === "completed") {
      return item.status === "Completed";
    }
    if (tab === "cancelled") {
      return item.status === "Cancelled";
    }
    return true;
  });

  const startIndex = (page - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);

  res.json({
    ...buildPaginatedResponse({
      items: items.map(mapInterviewRecord),
      total: filtered.length,
      page,
      limit,
    }),
    summary,
  });
});

export const getCandidateInterviewById = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.interviewId,
    candidateId: req.user.candidateId,
  })
    .populate({
      path: "jobId",
      populate: {
        path: "companyId",
      },
    })
    .populate("applicationId");

  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  res.json({
    interview: mapInterviewRecord(interview),
  });
});

export const confirmCandidateInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOneAndUpdate(
    {
      _id: req.params.interviewId,
      candidateId: req.user.candidateId,
    },
    {
      candidateStatus: "Confirmed",
    },
    { new: true },
  )
    .populate({
      path: "jobId",
      populate: {
        path: "companyId",
      },
    })
    .populate("applicationId");

  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  res.json({
    interview: mapInterviewRecord(interview),
  });
});

export const requestCandidateInterviewReschedule = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.interviewId,
    candidateId: req.user.candidateId,
  })
    .populate({
      path: "jobId",
      populate: {
        path: "companyId",
      },
    })
    .populate("applicationId");

  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  interview.candidateStatus = "Reschedule Requested";
  interview.rescheduleRequest = {
    status: "Pending",
    reason: req.body.reason,
    preferredDates: req.body.preferredDates || [],
    preferredTimeRanges: req.body.preferredTimeRanges || [],
    additionalNote: req.body.additionalNote || "",
    requestedAt: new Date(),
  };
  await interview.save();

  res.json({
    interview: mapInterviewRecord(interview),
  });
});

export const downloadCandidateInterviewCalendarInvite = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({
    _id: req.params.interviewId,
    candidateId: req.user.candidateId,
  }).populate("jobId");

  if (!interview) {
    throw new ApiError(404, "Interview not found");
  }

  const startDate = new Date(interview.startDateTime);
  const endDate = new Date(startDate.getTime() + interview.duration * 60000);
  const formatIcsDate = (date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NovaEdge//Candidate Interview//EN",
    "BEGIN:VEVENT",
    `UID:${interview._id}@novaedge.local`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${interview.title}`,
    `DESCRIPTION:${interview.notes || ""}`,
    `LOCATION:${interview.meetingLink || interview.location || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  res.setHeader("Content-Type", "text/calendar");
  res.setHeader("Content-Disposition", `attachment; filename="interview-${interview._id}.ics"`);
  res.send(ics);
});

export const getCandidateNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = { userId: req.user.userId };

  if (req.query.category) {
    filter.category = req.query.category;
  }

  if (req.query.read === "true") {
    filter.read = true;
  }

  if (req.query.read === "false") {
    filter.read = false;
  }

  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
  ]);

  res.json(buildPaginatedResponse({ items, total, page, limit }));
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, userId: req.user.userId },
    { read: true },
    { new: true },
  );
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  res.json({ notification });
});

export const markNotificationUnread = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, userId: req.user.userId },
    { read: false },
    { new: true },
  );
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  res.json({ notification });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.userId, read: false }, { read: true });
  res.json({ message: "All notifications marked as read." });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.notificationId, userId: req.user.userId });
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }
  res.json({ message: "Notification deleted." });
});

export const deleteReadNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user.userId, read: true });
  res.json({ message: "Read notifications deleted." });
});

export const getCandidatePrivacy = asyncHandler(async (req, res) => {
  const privacy = await CandidatePrivacySettings.findOneAndUpdate(
    { candidateId: req.user.candidateId },
    { $setOnInsert: { candidateId: req.user.candidateId } },
    { upsert: true, new: true },
  );

  res.json({ privacy });
});

export const updateCandidatePrivacy = asyncHandler(async (req, res) => {
  const privacy = await CandidatePrivacySettings.findOneAndUpdate(
    { candidateId: req.user.candidateId },
    req.body,
    { upsert: true, new: true },
  );

  res.json({ privacy });
});
