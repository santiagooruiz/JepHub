import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from "@casl/ability";

// Tipo laxo: acciones y subjects como string, con condiciones (scope) libres.
export type AppAbility = MongoAbility;

export type PermissionGrant = {
  key: string; // {subject}.{action} → clients.create
  restriction?: string | null; // p.ej. "own"
};

/**
 * Construye las habilidades CASL de un usuario a partir de sus permisos
 * activos. La clave `subject.action` se mapea a can(action, subject).
 */
export function defineAbilitiesFor(grants: PermissionGrant[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  for (const g of grants) {
    const [subject, action] = g.key.split(".");
    if (!subject || !action) continue;
    if (g.restriction === "own") {
      // Scope: solo registros propios (se afina cuando exista sesión).
      can(action, subject, { ownerId: "__self__" });
    } else {
      can(action, subject);
    }
  }

  return build();
}
