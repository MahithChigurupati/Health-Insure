const express = require("express");
const planRoute = require("./plan-route");

// Create an Express router
const router = express.Router();

// Define the routes to be mounted on the router
const routes = [
  {
    path: "/plan",
    route: planRoute,
  },
];

// Mount each route on the router
routes.forEach(({ path, route }) => {
  router.use(path, route);
});

// Export the configured router
module.exports = router;
