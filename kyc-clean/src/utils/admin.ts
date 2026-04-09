import type { User } from "@supabase/supabase-js";

export function hasDatabaseAdminRole(user: User | null): boolean {
  if (!user) return false;
  return user.app_metadata?.role === "admin";
}

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;

  const roleFromAppMetadata = user.app_metadata?.role;
  const roleFromUserMetadata = user.user_metadata?.role;

  if (roleFromAppMetadata === "admin" || roleFromUserMetadata === "admin") {
    return true;
  }

  const allowedEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!user.email) return false;
  return allowedEmails.includes(user.email.toLowerCase());
}
