export type AuthStateListener = (isAuthenticated: boolean) => void;

export interface BrowserAuthGateway {
  getAccessToken(): Promise<string | null>;
  isAuthenticated(): Promise<boolean>;
  onAuthStateChange(listener: AuthStateListener): () => void;
  sendMagicLink(email: string, redirectTo: string): Promise<void>;
  signOut(options?: { localOnly?: boolean }): Promise<void>;
}

export type AuthCallback = {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
};

export interface AuthCallbackGateway {
  completeCallback(callback: AuthCallback): Promise<{ email: string }>;
  signOut(): Promise<void>;
}
