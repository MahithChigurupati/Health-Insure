const { validateJSONSchema } = require("../validations/jsonSchema.validation");

// a function that checks if JSON data complies with a JSON schema
const isValidJSONSchema = async (json, schema) => {
  return await validateJSONSchema(json, schema);
};

module.exports = {
  isValidJSONSchema,
};
