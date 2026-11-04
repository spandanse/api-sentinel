const express = require('express');
const { Scan, Finding } = require('../models');

const router = express.Router();

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

const SCAN_ATTRIBUTES = [
  'id',
  'target',
  'status',
  'startedAt',
  'completedAt',
  'durationMs',
  'checksRun',
  'summary',
  'createdAt',
  'updatedAt',
];

const FINDING_ATTRIBUTES = [
  'id',
  'scanId',
  'checkId',
  'title',
  'status',
  'severity',
  'confidence',
  'evidence',
  'remediation',
  'createdAt',
  'updatedAt',
];

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

// GET /api/v1/scans
// Returns scan history with pagination.
router.get('/', async (req, res) => {
  const page = req.query.page === undefined
    ? 1
    : Number(req.query.page);

  const limit = req.query.limit === undefined
    ? DEFAULT_LIMIT
    : Number(req.query.limit);

  if (
    !isPositiveInteger(page) ||
    !isPositiveInteger(limit) ||
    limit > MAX_LIMIT ||
    !Number.isSafeInteger((page - 1) * limit)
  ) {
    return res.status(400).json({
      error: 'Invalid pagination parameters.',
      message: `Page must be a positive integer. Limit must be between 1 and ${MAX_LIMIT}.`,
    });
  }

  const offset = (page - 1) * limit;

  const queryOptions = {
    attributes: SCAN_ATTRIBUTES,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  };

  // Administrators can view all scans, including legacy CLI scans.
  // Regular users can only view scans belonging to their account.
  if (req.user.role !== 'admin') {
    queryOptions.where = { userId: req.user.id };
  }

  const result = await Scan.findAndCountAll(queryOptions);

  return res.status(200).json({
    data: result.rows,
    pagination: {
      page,
      limit,
      total: result.count,
      totalPages: Math.ceil(result.count / limit),
    },
  });
});

// GET /api/v1/scans/:id
// Returns one scan and all its findings.
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(id)) {
    return res.status(400).json({
      error: 'Invalid scan ID.',
      message: 'The scan ID must be a valid UUID.',
    });
  }

  const where = { id };

  // Returning 404 for another user's scan avoids revealing its existence.
  if (req.user.role !== 'admin') {
    where.userId = req.user.id;
  }

  const scan = await Scan.findOne({
    where,
    attributes: SCAN_ATTRIBUTES,
    include: [{
      model: Finding,
      as: 'findings',
      attributes: FINDING_ATTRIBUTES,
    }],
  });

  if (!scan) {
    return res.status(404).json({
      error: 'Scan not found.',
    });
  }

  return res.status(200).json({
    data: scan,
  });
});

module.exports = router;
