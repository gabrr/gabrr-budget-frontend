import type { BrowserAuthGateway } from "@/auth/gateway";
import { SupabaseBrowserAuthGateway } from "@/auth/providers/supabase/browser";

export const browserAuth: BrowserAuthGateway = new SupabaseBrowserAuthGateway();
