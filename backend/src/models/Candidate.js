import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    professionalTitle: {
      type: String,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    careerObjective: {
      type: String,
      trim: true,
    },
    yearsOfExperience: {
      type: Number,
      default: 0,
    },
    employmentStatus: {
      type: String,
      default: "Open to opportunities",
    },
    location: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    education: {
      type: [
        {
          institution: String,
          degree: String,
          field: String,
          graduationYear: Number,
        },
      ],
      default: [],
    },
    experience: {
      type: [
        {
          company: String,
          role: String,
          years: Number,
          description: String,
        },
      ],
      default: [],
    },
    projects: {
      type: [
        {
          name: String,
          description: String,
          technologies: [String],
        },
      ],
      default: [],
    },
    certifications: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: [],
    },
    resumeUrl: {
      type: String,
      default: "",
    },
    availability: {
      type: String,
      default: "Immediate",
    },
    socialLinks: {
      linkedin: {
        type: String,
        default: "",
      },
      github: {
        type: String,
        default: "",
      },
      portfolio: {
        type: String,
        default: "",
      },
      website: {
        type: String,
        default: "",
      },
      other: {
        type: [String],
        default: [],
      },
    },
    jobPreferences: {
      preferredRoles: {
        type: [String],
        default: [],
      },
      preferredIndustries: {
        type: [String],
        default: [],
      },
      preferredLocations: {
        type: [String],
        default: [],
      },
      remotePreference: {
        type: String,
        default: "Open",
      },
      employmentTypes: {
        type: [String],
        default: [],
      },
      expectedSalary: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
      noticePeriod: {
        type: String,
        default: "",
      },
      availableJoiningDate: {
        type: Date,
        default: null,
      },
      willingToRelocate: {
        type: Boolean,
        default: false,
      },
      openToRecruiterDiscovery: {
        type: Boolean,
        default: true,
      },
    },
    profileCompletion: {
      type: Number,
      default: 0,
    },
    discoverable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Candidate = mongoose.model("Candidate", candidateSchema);
