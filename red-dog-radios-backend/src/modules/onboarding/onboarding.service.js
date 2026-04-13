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
    populationServed,
    coverageArea,
    numberOfStaff,
    currentEquipment,
  } = data;

  // Input validation
  const rawOrgName = organizationName || opportunityTitle;
  if (!rawOrgName || typeof rawOrgName !== 'string' || rawOrgName.trim().length === 0) {
    throw new AppError('Organization name is required', 400);
  }
  if (rawOrgName.trim().length > 200) {
    throw new AppError('Organization name must be 200 characters or fewer', 400);
  }
  if (agencyTypes !== undefined && !Array.isArray(agencyTypes)) {
    throw new AppError('agencyTypes must be an array', 400);
  }
  if (programAreas !== undefined && !Array.isArray(programAreas)) {
    throw new AppError('programAreas must be an array', 400);
  }

  // Truncate long text fields
  const safeMission = typeof missionStatement === 'string' ? missionStatement.slice(0, 2000) : missionStatement;
  const safeRequest = typeof specificRequest === 'string' ? specificRequest.slice(0, 2000) : specificRequest;

  const orgName = rawOrgName.trim();
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
    'business': 'business',
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
      websiteUrl: orgWebsite,
      missionStatement: safeMission,
      agencyTypes: mappedAgencyTypes,
      programAreas: programAreas || focusAreas || [],
      focusAreas: focusAreas || programAreas || [],
      budgetRange: mappedBudget,
      timeline,
      goals: goals || [],
      status: 'active',
      createdBy: userId,
      ...(populationServed != null && { populationServed: Number(populationServed) }),
      ...(coverageArea && { coverageArea }),
      ...(numberOfStaff != null && { numberOfStaff: Number(numberOfStaff) }),
      ...(currentEquipment && { currentEquipment }),
    });
  } else {
    org.name = orgName;
    org.location = location || org.location;
    org.websiteUrl = orgWebsite || org.websiteUrl;
    org.missionStatement = safeMission || org.missionStatement;
    org.agencyTypes = mappedAgencyTypes.length ? mappedAgencyTypes : org.agencyTypes;
    org.programAreas = programAreas || focusAreas || org.programAreas;
    org.focusAreas = focusAreas || programAreas || org.focusAreas;
    org.budgetRange = mappedBudget || org.budgetRange;
    org.timeline = timeline || org.timeline;
    org.goals = goals || org.goals;
    if (populationServed != null) org.populationServed = Number(populationServed);
    if (coverageArea) org.coverageArea = coverageArea;
    if (numberOfStaff != null) org.numberOfStaff = Number(numberOfStaff);
    if (currentEquipment) org.currentEquipment = currentEquipment;
    await org.save();
  }

  // Mark user onboarding complete
  user.onboardingCompleted = true;
  user.organizationId = org._id;
  await user.save();

  return { user, organization: org };
};

module.exports = { complete };
