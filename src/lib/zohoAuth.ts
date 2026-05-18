import { ClientCredentials, AuthorizationCode } from 'simple-oauth2';

// NOTE: Zoho requires token refresh. Simple-oauth2 handles this if configured correctly.
// For Refresh Token flow (Zoho Books):
const config = {
  client: {
    id: process.env.ZOHO_CLIENT_ID!,
    secret: process.env.ZOHO_CLIENT_SECRET!,
  },
  auth: {
    tokenHost: 'https://accounts.zoho.com',
    tokenPath: '/oauth/v2/token',
  },
};

const oauth2 = new AuthorizationCode(config);

let accessToken = oauth2.createToken({
  refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
});

export async function getZohoToken(): Promise<string> {
  if (accessToken.expired()) {
    try {
      accessToken = await accessToken.refresh();
      console.log('Zoho token refreshed successfully');
    } catch (error) {
      console.error('Error refreshing Zoho token:', error);
      throw error;
    }
  }
  return accessToken.token.access_token;
}
