// GoogleAuthService is deprecated. Use expo-auth-session based Google login instead.
export const googleAuthService = {
  async configure() {
    throw new Error('googleAuthService is deprecated. Use expo-auth-session based login.');
  },
  async signIn() {
    throw new Error('googleAuthService is deprecated. Use expo-auth-session based login.');
  },
  async signOut() {
    throw new Error('googleAuthService is deprecated. Use expo-auth-session based login.');
  },
  async getCurrentUser() {
    return null;
  },
  async isSignedIn() {
    return false;
  }
}; 