import { redirect } from "next/navigation";

import { getCurrentUser, type CurrentUser } from "./auth";

/** Exige sesión; si no hay, redirige a /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Exige un permiso `{subject}.{action}` (ej. requirePermission("view","roles")).
 * Si el usuario no lo tiene, redirige al dashboard.
 */
export async function requirePermission(
  action: string,
  subject: string
): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.ability.can(action, subject)) redirect("/dashboard");
  return user;
}
