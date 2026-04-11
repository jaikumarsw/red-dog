const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const funderService = require('./funder.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');

const getOne = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  const funder = await funderService.getOne(req.params.id, organizationId);
  return success(res, funder, 'Funder retrieved');
});

const saveFunder = asyncHandler(async (req, res) => {
  const orgId = await resolveAgencyOrganizationId(req.user);
  const result = await funderService.saveFunder(req.params.id, orgId);
  return success(res, result, 'Funder saved');
});

module.exports = { getOne, saveFunder };
