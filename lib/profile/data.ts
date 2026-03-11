import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { Database } from "@/types/database";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export const getCurrentProfile = cache(async (): Promise<ProfileRow> => {
  const user = await requireUser();
  const supabase = await createClient();
  const profilesTable = supabase.from("profiles");

  const { data: profile, error } = await profilesTable
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Failed to load profile.");
  }

  if (profile) {
    return profile;
  }

  const email = user.email?.toLowerCase();
  if (!email || !email.endsWith("@nu.edu.kz")) {
    throw new Error("Authenticated account does not have a valid NU email.");
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  const { data: createdProfile, error: createError } = await profilesTable
    .insert({
      user_id: user.id,
      nu_email: email,
      full_name: fullName,
    })
    .select("*")
    .single();

  if (createError || !createdProfile) {
    throw new Error("Failed to initialize profile.");
  }

  return createdProfile;
});
