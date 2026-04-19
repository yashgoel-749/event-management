const { validationResult } = require('express-validator');

/**
 * Middleware that runs express-validator checks and
 * returns 400 if any validation errors are found.
 * Usage: validate([body('name').notEmpty(), ...])
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations sequentially
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    next();
  };
};

module.exports = validate;
