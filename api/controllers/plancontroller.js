const status = require("http-status");
const { ifKeyExists, getETag } = require("../services/redis.service");
const config = require("../../config/local.json");
const { isValidJSONSchema } = require("../services/jsonSchema.service");

const PLAN_SCHEMA = require("../models/plan.model");
const {
  createSavePlan,
  getSavedPlan,
  deleteSavedPlan,
  generateETag,
} = require("../services/plan.service");

const getPlan = async (req, res) => {
  try {
    // Extract objectId from request parameters
    const { objectId } = req.params;

    // Create a key in the format <type>_<objectId>
    const KEY = `${config.PLAN_TYPE}_${objectId}`;

    // Check if the key exists in Redis
    const isKeyValid = await ifKeyExists(KEY);

    // If key does not exist, return 404 with error message
    if (!isKeyValid) {
      return res.status(status.NOT_FOUND).send({
        message: `Invalid ObjectId! - ${objectId}`,
        value: objectId,
        type: "Invalid",
      });
    }

    // Get ETag for caching
    const eTag = await getETag(KEY);
    const urlETag = req.headers["if-none-match"];

    // If ETag matches, return Not Modified status
    if (urlETag && urlETag === eTag) {
      res.setHeader("ETag", eTag);
      return res.status(status.NOT_MODIFIED);
    }

    // Fetch the plan from Redis
    const plan = await getSavedPlan(KEY);

    // Set ETag header and return the plan with 200 status
    res.setHeader("ETag", eTag);
    return res.status(status.OK).send(plan);
  } catch (error) {
    // Handle any errors and return 401 with error message
    console.error(error);
    return res.status(status.UNAUTHORIZED).send({
      message: "Something went wrong!!",
    });
  }
};

const createPlan = async (req, res) => {
  try {
    // Extract plan data from request body
    const planJSON = req.body;

    // Validate request body for presence and JSON schema
    if (!planJSON) {
      return res.status(status.BAD_REQUEST).send({
        message: "Invalid body!",
        type: "Invalid",
      });
    }

    // Validate JSON schema using isValidJSONSchema function
    const isValidSchema = await isValidJSONSchema(planJSON, PLAN_SCHEMA);

    // If JSON schema is invalid, return 400 with error details
    if (isValidSchema?.error) {
      return res.status(status.BAD_REQUEST).send({
        message: "Invalid Schema!",
        type: "Invalid",
        ...isValidSchema?.data,
      });
    }

    // Generate KEY for Redis storage
    const KEY = `${config.PLAN_TYPE}_${planJSON.objectId}`;

    // Check if plan already exists, return 409 with error message
    const isKeyValid = await ifKeyExists(KEY);
    if (isKeyValid) {
      return res.status(status.CONFLICT).send({
        message: `Plan already exists! - ${planJSON.objectId}`,
        type: "Already Exists",
      });
    }

    // Create the plan in Redis
    await createSavePlan(KEY, planJSON);

    // Generate ETag for the newly created plan
    const eTag = generateETag(KEY, planJSON);

    // Set ETag header and return success response with 201 status
    res.setHeader("ETag", eTag);
    return res.status(status.CREATED).send({
      message: "Plan created successfully",
      objectId: planJSON.objectId,
    });
  } catch (error) {
    // Handle any errors and return 401 with error message
    console.error(error);
    return res.status(status.UNAUTHORIZED).send({
      message: "Something went wrong!!",
    });
  }
};

const deletePlan = async (req, res) => {
  try {
    // Extract objectId from request parameters
    const { objectId } = req.params;

    // Create a key in the format <type>_<objectId>
    const KEY = `${config.PLAN_TYPE}_${objectId}`;

    // Check if the key exists in Redis
    const isKeyValid = await ifKeyExists(KEY);

    // If key does not exist, return 404 with error message
    if (!isKeyValid) {
      return res.status(status.NOT_FOUND).send({
        message: `Invalid ObjectId! - ${objectId}`,
        value: objectId,
        type: "Invalid",
      });
    }

    // Check If-Match header for ETag
    const urlETag = req.headers["if-match"] || [];
    if (!urlETag.length) {
      return res.status(status.NOT_FOUND).send({
        message: "ETag not provided!",
      });
    }

    // Get ETag from Redis
    const eTag = await getETag(KEY);

    // If ETag does not match, return 412 Precondition Failed
    if (urlETag !== eTag) {
      res.setHeader("ETag", eTag);
      return res.status(status.PRECONDITION_FAILED).send();
    }

    // Delete the plan from Redis
    await deleteSavedPlan(KEY);

    // Return success response with 204 status
    return res.status(status.NO_CONTENT).send({
      message: "Plan deleted successfully",
      objectId,
    });
  } catch (error) {
    // Handle any errors and return 401 with error message
    console.error(error);
    return res.status(status.UNAUTHORIZED).send({
      message: "Something went wrong!!",
    });
  }
};

const putPlan = async (req, res) => {
  try {
    // Extract objectId from request parameters
    const { objectId } = req.params;
    const planJSON = req.body;

    // Create a key in the format <type>_<objectId>
    const KEY = `${config.PLAN_TYPE}_${objectId}`;

    // Check if the key exists in Redis
    const isKeyValid = await ifKeyExists(KEY);

    // If key does not exist, return 404 with error message
    if (!isKeyValid) {
      return res.status(status.NOT_FOUND).send({
        message: `Invalid ObjectId! - ${objectId}`,
        value: objectId,
        type: "Invalid",
      });
    }

    // If invalid body, return 400 with error message
    if (!planJSON) {
      return res.status(status.BAD_REQUEST).send({
        message: "Invalid body!",
        type: "Invalid",
      });
    }

    // Validate JSON schema using isValidJSONSchema function
    const isValidSchema = await isValidJSONSchema(planJSON, PLAN_SCHEMA);

    // If JSON schema is invalid, return 400 with error details
    if (isValidSchema?.error) {
      return res.status(status.BAD_REQUEST).send({
        message: "Invalid Schema!",
        type: "Invalid",
        ...isValidSchema?.data,
      });
    }

    // Check If-Match header for ETag
    const urlETag = req.headers["if-match"] || [];
    if (!urlETag.length) {
      return res.status(status.NOT_FOUND).send({
        message: "ETag not provided!",
      });
    }

    // Get ETag from Redis
    const eTag = await getETag(KEY);

    // If ETag does not match, return 412 Precondition Failed
    if (urlETag !== eTag) {
      res.setHeader("ETag", eTag);
      return res.status(status.PRECONDITION_FAILED).send();
    }

    // Delete the existing plan
    await deleteSavedPlan(KEY);

    // Create and save the updated plan
    await createSavePlan(KEY, planJSON);

    // Generate new ETag for the updated plan
    const eTagNew = generateETag(KEY, planJSON);

    // Fetch the updated plan from Redis
    const updatedPlan = await getSavedPlan(KEY);

    // Set ETag header and return the updated plan with 200 status
    res.setHeader("ETag", eTagNew);
    return res.status(status.OK).send(updatedPlan);
  } catch (error) {
    // Handle any errors and return 401 with error message
    console.error(error);
    return res.status(status.UNAUTHORIZED).send({
      message: "Something went wrong!!",
    });
  }
};

const patchPlan = async (req, res) => {
  try {
    // Extract objectId from request parameters
    const { objectId } = req.params;
    const planJSON = req.body;

    // Create a key in the format <type>_<objectId>
    const KEY = `${config.PLAN_TYPE}_${objectId}`;

    // Check if the key exists in Redis
    const isKeyValid = await ifKeyExists(KEY);

    // If key does not exist, return 404 with error message
    if (!isKeyValid) {
      return res.status(status.NOT_FOUND).send({
        message: `Invalid ObjectId! - ${objectId}`,
        value: objectId,
        type: "Invalid",
      });
    }

    // Validate JSON schema using isValidJSONSchema function
    const isValidSchema = await isValidJSONSchema(planJSON, PLAN_SCHEMA);

    // If JSON schema is invalid, return 400 with error details
    if (isValidSchema?.error) {
      return res.status(status.BAD_REQUEST).send({
        message: "Invalid Schema!",
        type: "Invalid",
        ...isValidSchema?.data,
      });
    }

    // Check If-Match header for ETag
    const urlETag = req.headers["if-match"] || [];
    if (!urlETag.length) {
      return res.status(status.NOT_FOUND).send({
        message: "ETag not provided!",
      });
    }

    // Get ETag from Redis
    const eTag = await getETag(KEY);

    // If ETag does not match, return 412 Precondition Failed
    if (urlETag !== eTag) {
      res.setHeader("ETag", eTag);
      return res.status(status.PRECONDITION_FAILED).send();
    }

    // Delete the existing plan
    await deleteSavedPlan(KEY);

    // Create and save the updated plan
    await createSavePlan(KEY, planJSON);

    // Generate new ETag for the updated plan
    const eTagNew = generateETag(KEY, planJSON);

    // Fetch the updated plan from Redis
    const updatedPlan = await getSavedPlan(KEY);

    // Set ETag header and return the updated plan with 200 status
    res.setHeader("ETag", eTagNew);
    return res.status(status.OK).send(updatedPlan);
  } catch (error) {
    // Handle any errors and return 500 with error message
    console.error(error);
    return res.status(status.INTERNAL_SERVER_ERROR).send({
      message: error.message,
    });
  }
};

module.exports = {
  getPlan,
  createPlan,
  deletePlan,
  putPlan,
  patchPlan,
};
