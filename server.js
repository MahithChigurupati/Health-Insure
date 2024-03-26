const app = require("./api/app.js");
const config = require("./config/config.json");
require("dotenv").config();

const PORT = config.PORT;

// Listen to the Express server on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
