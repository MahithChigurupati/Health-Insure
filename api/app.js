const express = require("express");
const cors = require("cors");
const routes = require("./routes");

// Create an Express application
const app = express();

// Enable CORS for cross-origin requests
app.use(cors());

// Parse incoming request bodies as JSON
app.use(express.json());

// Parse URL-encoded data with extended mode
app.use(express.urlencoded({ extended: true }));

// Register API routes under the "/v1" prefix
app.use("/v1", routes);

// Handle invalid routes with a 400 Bad Request response
app.use("*", (req, res) => {
  res.status(400).send("Invalid route");
});

module.exports = app;
