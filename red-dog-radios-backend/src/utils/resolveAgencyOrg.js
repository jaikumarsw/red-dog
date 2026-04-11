const Organization = require('../modules/organizations/organization.schema');

/**
 * Organization linked to an agency user (JWT user.organizationId or legacy createdBy).
 */
async function resolveAgencyOrganizationId(user) {
  if (!user) return null;
  if (user.organizationId) return user.organizationId;
  const org = await Organization.findOne({ createdBy: user._id }).select('_id');
  return org?._id || null;
}

module.exports = { resolveAgencyOrganizationId };
