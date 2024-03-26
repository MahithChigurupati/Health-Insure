const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const jwksRsa = require("jwks-rsa");

// Load Google Client ID from local configuration
const GOOGLE_CLIENT_ID = process.env.CLIENT_ID;

// Initialize Google OAuth2Client with the Client ID
const gClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware function to authenticate JWT token
const auth = async (req, res, next) => {
  try {
    // Extract JWT token from Authorization header
    const token = req.headers["authorization"];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }

    // Decode the JWT token to extract its header
    const decodedToken = jwt.decode(token.replace("Bearer ", ""), {
      complete: true,
    });
    if (!decodedToken) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    // Fetch the public key from Google's JWKS (JSON Web Key Set) endpoint based on the token's "kid" (key ID)
    const keyClient = jwksRsa({
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
    });

    const kid = decodedToken.header.kid;
    const key = await keyClient.getSigningKey(kid);

    const signingKey = key.getPublicKey();

    // Verify the JWT token's signature using the retrieved public key
    jwt.verify(
      token.replace("Bearer ", ""),
      signingKey,
      async (err, decoded) => {
        if (err) {
          return res.status(401).json({ error: "Unauthorized: Invalid token" });
        }

        // Verify the JWT token with Google's OAuth2Client to ensure its validity
        await gClient.verifyIdToken({
          idToken: token.replace("Bearer ", ""),
        });

        // If verification is successful, set req.user to the decoded token payload and proceed to the next middleware
        req.user = decoded;
        next();
      }
    );
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = auth;
