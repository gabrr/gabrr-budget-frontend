import type { AuthCallbackGateway } from "@/auth/gateway";
import { SupabaseAuthCallbackGateway } from "@/auth/providers/supabase/server";

export function createAuthCallbackGateway(): AuthCallbackGateway {
  return new SupabaseAuthCallbackGateway();
}
