import type { BrowserAuthGateway } from "@/auth/gateway";
import { SupabaseBrowserAuthGateway } from "@/auth/providers/supabase/browser";

class LocalBrowserAuthGateway implements BrowserAuthGateway {
  async getAccessToken(): Promise<string> {
    return "local-development";
  }

  async isAuthenticated(): Promise<boolean> {
    return true;
  }

  onAuthStateChange(listener: (isAuthenticated: boolean) => void): () => void {
    listener(true);
    return () => undefined;
  }

  async startSocialSignIn(): Promise<void> {
    window.location.assign("/dashboard");
  }

  async signOut(): Promise<void> {
    window.location.assign("/dashboard");
  }
}

export const browserAuth: BrowserAuthGateway =
  process.env.NEXT_PUBLIC_AUTH_MODE === "local"
    ? new LocalBrowserAuthGateway()
    : new SupabaseBrowserAuthGateway();
