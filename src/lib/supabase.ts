
import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rqzpjrjghsmfrrogiqjv.supabase.co";
const supabaseKey =
  "sb_publishable_l5fQAwN0ZGmRMuFJbUUN-g_4E0pZIAk";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables. Check .env.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
