const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => e.msg)
    });
  }
  next();
};

const validateExecuteTask = [
  body('task')
    .trim()
    .notEmpty().withMessage('Task is required')
    .isLength({ max: 1000 }).withMessage('Task must be under 1000 characters'),
  body('mode')
    .optional()
    .isIn(['demo', 'strict']).withMessage('Mode must be "demo" or "strict"'),
  handleValidationErrors
];

const validateApproveSteps = [
  body('steps')
    .isArray({ min: 1 }).withMessage('Steps must be a non-empty array'),
  body('steps.*.action')
    .isString().notEmpty().withMessage('Each step must have an action'),
  body('mode')
    .optional()
    .isIn(['demo', 'strict']).withMessage('Mode must be "demo" or "strict"'),
  handleValidationErrors
];

const validateRetryDecision = [
  body('decision')
    .isIn(['retry', 'skip', 'cancel', 'ai_alternative']).withMessage('Invalid decision'),
  body('step')
    .isObject().withMessage('Step is required'),
  handleValidationErrors
];

const validateHandlePopup = [
  body('action')
    .isIn(['accept', 'dismiss']).withMessage('Action must be "accept" or "dismiss"'),
  handleValidationErrors
];

module.exports = {
  validateExecuteTask,
  validateApproveSteps,
  validateRetryDecision,
  validateHandlePopup
};
