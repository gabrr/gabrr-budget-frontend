import type { EmailOtpType } from "@supabase/supabase-js";
import type { AuthCallback, AuthCallbackGateway } from "@/auth/gateway";
import { createClient } from "@/lib/supabase/server";

export class SupabaseAuthCallbackGateway implements AuthCallbackGateway {
  async completeCallback({
    code,
    tokenHash,
    type,
  }: AuthCallback): Promise<{ email: string }> {
    const client = await createClient();
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (tokenHash && type) {
      const { error } = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
      if (error) throw error;
    } else {
      throw new Error("Missing authentication callback parameters");
    }

    const { data, error } = await client.auth.getUser();
    const email = data.user?.email?.trim().toLowerCase();
    if (error || !email) throw error ?? new Error("Authenticated user email is missing");
    return { email };
  }

  async signOut(): Promise<void> {
    const client = await createClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }
}
