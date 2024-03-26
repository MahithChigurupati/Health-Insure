const Ajv = require("ajv");

// Create an instance of Ajv with specific configuration options
const ajv = new Ajv({ allErrors: true, async: true, strict: false });

const validateJSONSchema = async (json, schema) => {
  // Compile the JSON schema using Ajv
  const validate = ajv.compile(schema);

  // Validate the JSON data against the compiled schema
  const valid = await validate(json);

  // If validation fails, parse the errors and return error details
  if (!valid) {
    const errors = parseErrors(validate.errors);
    return { error: true, data: errors };
  }

  return { error: false };
};

// Function to parse validation errors into a structured format
const parseErrors = (validationErrors) => {
  return validationErrors.map((error) => ({
    message: error.message, // Error message
    dataPath: error.dataPath, // Path in the JSON where the error occurred
    schemaPath: error.schemaPath, // Path in the JSON schema causing the error
    params: error.params, // Additional parameters related to the error
  }));
};

module.exports = {
  validateJSONSchema,
};
