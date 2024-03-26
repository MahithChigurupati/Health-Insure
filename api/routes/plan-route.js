const express = require("express");
const { planController } = require("../controllers");
const auth = require("../middlewares/googleidp-auth");

// Create an Express router
const router = express.Router();

// Routes for CRUD operations on plans
router.route("/").post(auth, planController.createPlan);

router
  .route("/:objectId")
  .get(auth, planController.getPlan)
  .delete(auth, planController.deletePlan)
  .put(auth, planController.putPlan)
  .patch(auth, planController.patchPlan);

// Export the configured router
module.exports = router;
