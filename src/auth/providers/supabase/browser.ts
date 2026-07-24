import type {
  BrowserAuthGateway,
  SocialAuthProvider,
} from "@/auth/gateway";
import { createClient } from "@/lib/supabase/client";

export class SupabaseBrowserAuthGateway implements BrowserAuthGateway {
  async getAccessToken(): Promise<string | null> {
    const { data } = await createClient().auth.getSession();
    return data.session?.access_token ?? null;
  }

  async isAuthenticated(): Promise<boolean> {
    const { data } = await createClient().auth.getSession();
    return Boolean(data.session);
  }

  onAuthStateChange(listener: (isAuthenticated: boolean) => void): () => void {
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      listener(Boolean(session));
    });
    return () => data.subscription.unsubscribe();
  }

  async startSocialSignIn(
    provider: SocialAuthProvider,
    redirectTo: string,
  ): Promise<void> {
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) throw error;
  }

  async signOut(options?: { localOnly?: boolean }): Promise<void> {
    const { error } = await createClient().auth.signOut(
      options?.localOnly ? { scope: "local" } : undefined,
    );
    if (error) throw error;
  }
}
