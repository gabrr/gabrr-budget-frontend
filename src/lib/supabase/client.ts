import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const { url, publishableKey } = supabaseConfig();
  browserClient = createBrowserClient(url, publishableKey);
  return browserClient;
}
