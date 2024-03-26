const app = require("./api/app.js"); // Import the Express application
const config = require("./config/local.json"); // Load local configuration
require("dotenv").config(); // Load environment variables from .env file

const PORT = `${process.env.PORT}` || config.PORT; // Set the port to use

// Listen to the Express server on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
