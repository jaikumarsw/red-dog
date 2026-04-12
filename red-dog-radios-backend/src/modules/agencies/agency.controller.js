const asyncHandler = require('../../utils/asyncHandler');
const { success, created, paginate } = require('../../utils/apiResponse');
const agencyService = require('./agency.service');
const Organization = require('../organizations/organization.schema');
const { resolveAgencyOrganizationId } = require('../../utils/resolveAgencyOrg');
const { AppError } = require('../../middlewares/error.middleware');

const loadUserOrg = async (user) => {
  const organizationId = await resolveAgencyOrganizationId(user);
  if (!organizationId) return null;
  return Organization.findById(organizationId);
};

const getAll = asyncHandler(async (req, res) => {
  const org = await loadUserOrg(req.user);
  if (!org) {
    return paginate(
      res,
      [],
      { totalDocs: 0, page: 1, limit: 20, totalPages: 0, hasNextPage: false, hasPrevPage: false },
      'Agencies retrieved'
    );
  }
  const result = await agencyService.getAll({ ...req.query, agencyName: org.name });
  return paginate(res, result.docs, result, 'Agencies retrieved');
});

const assertAgencyForUser = async (user, agencyId) => {
  const org = await loadUserOrg(user);
  if (!org) throw new AppError('Agency not found', 404);
  const agency = await agencyService.getOne(agencyId);
  if (agency.name !== org.name) throw new AppError('Agency not found', 404);
  return agency;
};

const getOne = asyncHandler(async (req, res) => {
  const agency = await assertAgencyForUser(req.user, req.params.id);
  return success(res, agency);
});

const create = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (body.email && !body.grantContactEmail) {
    body.grantContactEmail = body.email;
  }
  delete body.email;
  const agency = await agencyService.create(body);
  return created(res, agency, 'Agency created');
});

const update = asyncHandler(async (req, res) => {
  await assertAgencyForUser(req.user, req.params.id);
  const agency = await agencyService.update(req.params.id, req.body);
  return success(res, agency, 'Agency updated');
});

module.exports = { getAll, getOne, create, update };
