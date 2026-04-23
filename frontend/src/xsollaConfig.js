// Configuration needed in Publisher Account (from XSOLLA_SETUP.md)
export const XSOLLA_CONFIG = {
  // Get these from Publisher Account > Players > Login > your Login project
  loginProjectId: process.env.REACT_APP_XSOLLA_LOGIN_PROJECT_ID || "YOUR_LOGIN_PROJECT_ID",
  clientId: process.env.REACT_APP_XSOLLA_CLIENT_ID || "YOUR_CLIENT_ID",
  
  // Should match what you set in Publisher Account OAuth 2.0 settings
  redirectUri: process.env.REACT_APP_XSOLLA_REDIRECT_URI || window.location.origin + "/auth/callback",
  
  // API URL for your backend
  apiUrl: process.env.REACT_APP_API_URL || "http://localhost:8080/api",
  
  // Use sandbox for testing, set to false in production
  sandbox: process.env.REACT_APP_XSOLLA_SANDBOX !== "false",
};

export default XSOLLA_CONFIG;
