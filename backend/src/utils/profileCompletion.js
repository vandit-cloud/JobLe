const REQUIRED_PROFILE_FIELDS = [
  "name",
  "website",
  "industry",
  "companySize",
  "foundedYear",
  "email",
  "phone",
  "headquarters",
  "officeLocations",
  "description",
  "mission",
  "culture",
  "benefits",
];

export function computeProfileCompletion(company) {
  const missingFields = REQUIRED_PROFILE_FIELDS.filter((field) => {
    const value = company?.[field];
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return !value;
  });

  const completed = REQUIRED_PROFILE_FIELDS.length - missingFields.length;
  const percentage = Math.round((completed / REQUIRED_PROFILE_FIELDS.length) * 100);

  return {
    percentage,
    missingFields,
  };
}

