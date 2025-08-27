import { supabase } from "../lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";

export default function Login() {
  return (
    <div style={{ maxWidth: 420, margin: "4rem auto" }}>
      <Auth supabaseClient={supabase} providers={[]} />
    </div>
  );
}
