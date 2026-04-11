const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const orgService = require('./organization.service');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

const getAll = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId) {
    return paginate(
      res,
      [],
      { totalDocs: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      'Organizations retrieved'
    );
  }
  const result = await orgService.getAll({ ...req.query, id: organizationId });
  return paginate(res, result.docs, result, 'Organizations retrieved');
});

const getOne = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId || req.params.id !== String(organizationId)) {
    throw new AppError('Organization not found', 404);
  }
  const org = await orgService.getOne(req.params.id);
  return success(res, org);
});

const create = asyncHandler(async (req, res) => {
  const org = await orgService.create(req.body, req.user._id);
  return created(res, org, 'Organization created');
});

const update = asyncHandler(async (req, res) => {
  const organizationId = await resolveAgencyOrganizationId(req.user);
  if (!organizationId || req.params.id !== String(organizationId)) {
    throw new AppError('Organization not found', 404);
  }
  const org = await orgService.update(req.params.id, req.body);
  return success(res, org, 'Organization updated');
});

module.exports = { getAll, getOne, create, update };
