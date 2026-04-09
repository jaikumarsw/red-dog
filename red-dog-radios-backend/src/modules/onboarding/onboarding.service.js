const User = require('../auth/user.schema');
const Organization = require('../organizations/organization.schema');
const { AppError } = require('../../middlewares/error.middleware');

const complete = async (userId, data) => {
  const {
    organizationName,
    opportunityTitle,
    location,
    website,
    websiteUrl,
    missionStatement,
    agencyTypes,
    programAreas,
    focusAreas,
    specificRequest,
    budgetRange,
    timeline,
    goals,
  } = data;

  const orgName = organizationName || opportunityTitle || 'My Organization';
  const orgWebsite = website || websiteUrl;

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  // Map frontend agency type IDs to backend enum values
  const agencyTypeMap = {
    'law-enforcement': 'law_enforcement',
    'fire-services': 'fire_services',
    'ems': 'ems',
    'emergency-management': 'emergency_management',
    '911-centers': '911_centers',
    'hospitals': 'hospitals',
    'public-communication': 'public_safety_comms',
    'multi-agency': 'multi_agency',
  };

  const mappedAgencyTypes = (agencyTypes || []).map((t) => agencyTypeMap[t] || t).filter(Boolean);

  // Map frontend budget IDs to backend enum values
  const budgetMap = {
    'under-25k': 'under_25k',
    'under_25k': 'under_25k',
    '25k-100k': '25k_150k',
    '25k_150k': '25k_150k',
    '100k-500k': '150k_500k',
    '150k_500k': '150k_500k',
    '500k-plus': '500k_plus',
    '500k_plus': '500k_plus',
  };
  const mappedBudget = budgetMap[budgetRange] || budgetRange;

  // Create or update organization
  let org = await Organization.findOne({ createdBy: userId });
  if (!org) {
    org = await Organization.create({
      name: orgName,
      location,
      website: orgWebsite,
      websiteUrl: orgWebsite,
      missionStatement,
      agencyTypes: mappedAgencyTypes,
      programAreas: programAreas || focusAreas || [],
      focusAreas: focusAreas || programAreas || [],
      budgetRange: mappedBudget,
      timeline,
      goals: goals || [],
      status: 'active',
      createdBy: userId,
    });
  } else {
    org.name = orgName;
    org.location = location || org.location;
    org.website = orgWebsite || org.website;
    org.websiteUrl = orgWebsite || org.websiteUrl;
    org.missionStatement = missionStatement || org.missionStatement;
    org.agencyTypes = mappedAgencyTypes.length ? mappedAgencyTypes : org.agencyTypes;
    org.programAreas = programAreas || focusAreas || org.programAreas;
    org.focusAreas = focusAreas || programAreas || org.focusAreas;
    org.budgetRange = mappedBudget || org.budgetRange;
    org.timeline = timeline || org.timeline;
    org.goals = goals || org.goals;
    await org.save();
  }

  // Mark user onboarding complete
  user.onboardingCompleted = true;
  user.organizationId = org._id;
  await user.save();

  return { user, organization: org };
};

module.exports = { complete };
