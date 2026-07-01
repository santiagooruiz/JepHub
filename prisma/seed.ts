import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// Contraseña de desarrollo para los usuarios de ejemplo.
const DEV_PASSWORD = "jep12345";

// ─── Roles (con cupo/licenciamiento, según la spec) ───
const ROLES: { name: string; seatLimit: number }[] = [
  { name: "Administrador", seatLimit: 2 },
  { name: "Asesor", seatLimit: 20 },
  { name: "Diseñador", seatLimit: 5 },
  { name: "Diseñador Comercial", seatLimit: 5 },
  { name: "Analista de Cartera", seatLimit: 1 },
  { name: "Analista de Pedido", seatLimit: 2 },
  { name: "Jefe de compra", seatLimit: 1 },
  { name: "Consultor", seatLimit: 3 },
];

// ─── Catálogo de permisos {modulo}.{accion} ───
const PERMISSIONS: { key: string; name: string }[] = [
  // clientes
  { key: "clients.view", name: "Ver clientes" },
  { key: "clients.create", name: "Crear cliente" },
  { key: "clients.edit", name: "Editar cliente" },
  { key: "clients.delete", name: "Eliminar cliente" },
  { key: "clients.assign", name: "Asignación de asesor" },
  { key: "clients.list_price", name: "Asignar lista de precio" },
  { key: "clients.import", name: "Importar prospectos/clientes" },
  { key: "clients.createcontact", name: "Crear contacto" },
  { key: "clients.editcontact", name: "Editar contacto" },
  { key: "clients.deletecontact", name: "Eliminar contacto" },
  // oportunidades
  { key: "opportunities.view", name: "Ver oportunidades" },
  { key: "opportunities.create", name: "Crear oportunidad" },
  { key: "opportunities.edit", name: "Editar oportunidad" },
  { key: "opportunities.delete", name: "Eliminar oportunidad" },
  // cotizaciones
  { key: "quotes.view", name: "Ver cotizaciones" },
  { key: "quotes.create", name: "Crear cotización" },
  { key: "quotes.edit", name: "Editar cotización" },
  { key: "quotes.delete", name: "Eliminar cotización" },
  { key: "quotes.approve", name: "Aprobar cotización" },
  { key: "quotes.send", name: "Enviar cotización" },
  { key: "quotes.pdf", name: "Descargar PDF de cotización" },
  { key: "quotes.sign", name: "Gestionar firma del cliente" },
  // pedidos
  { key: "orders.view", name: "Ver pedidos" },
  { key: "orders.create", name: "Crear pedido" },
  { key: "orders.edit", name: "Editar pedido" },
  { key: "orders.delete", name: "Eliminar pedido" },
  { key: "orders.approve_ingreso", name: "Aprobación ingreso pedido" },
  { key: "orders.approve_fabricacion", name: "Aprobación fabricación" },
  { key: "orders.approve_instalacion", name: "Aprobación instalación" },
  { key: "orders.approve_facturacion", name: "Aprobación facturación" },
  { key: "orders.send_ofimatica", name: "Enviar pedido a ofimática" },
  // backlog diseño
  { key: "backlog_design.view", name: "Ver backlog de diseño" },
  { key: "backlog_design.create", name: "Crear solicitud de diseño" },
  { key: "backlog_design.edit", name: "Editar solicitud de diseño" },
  { key: "backlog_design.assign_designer", name: "Asignar diseñador" },
  { key: "backlog_design.approved_files", name: "Aprobación de archivos en backlog" },
  { key: "backlog_design.approved_final", name: "Aprobación en backlog (validación final)" },
  // diseños especiales
  { key: "special_designs.view", name: "Ver biblioteca especiales" },
  { key: "special_designs.create", name: "Crear diseño especial" },
  { key: "special_designs.edit", name: "Editar diseño especial" },
  // reportes
  { key: "reports.bi_quotes", name: "BI Cotizaciones" },
  { key: "reports.bi_orders", name: "BI Pedidos" },
  { key: "reports.bi_tracking", name: "BI Seguimiento" },
  { key: "reports.calendar", name: "Calendario de actividades" },
  // configuración
  { key: "categories.view", name: "Ver categorías" },
  { key: "categories.manage", name: "Gestionar categorías" },
  { key: "tags.view", name: "Ver tags" },
  { key: "tags.manage", name: "Gestionar tags" },
  { key: "users.view", name: "Ver usuarios" },
  { key: "users.create", name: "Crear usuario" },
  { key: "users.edit", name: "Editar usuario" },
  { key: "users.delete", name: "Eliminar usuario" },
  { key: "parameters.view", name: "Ver parámetros" },
  { key: "parameters.manage", name: "Gestionar parámetros" },
  { key: "roles.view", name: "Ver roles" },
  { key: "roles.manage", name: "Gestionar roles/permisos" },
];

// ─── Asignación de permisos por rol ("*" = todos) ───
const GRANTS: Record<string, string[] | "*"> = {
  Administrador: "*",
  Asesor: [
    "clients.view", "clients.create", "clients.edit", "clients.assign",
    "clients.list_price", "clients.import", "clients.createcontact",
    "clients.editcontact", "clients.deletecontact",
    "opportunities.view", "opportunities.create", "opportunities.edit",
    "quotes.view", "quotes.create", "quotes.edit", "quotes.send",
    "quotes.pdf", "quotes.sign",
    "orders.view", "backlog_design.view", "special_designs.view",
    "reports.calendar",
  ],
  Diseñador: [
    "backlog_design.view", "backlog_design.create", "backlog_design.edit",
    "backlog_design.assign_designer", "backlog_design.approved_files",
    "backlog_design.approved_final",
    "special_designs.view", "special_designs.create", "special_designs.edit",
    "quotes.view", "orders.view",
  ],
  "Diseñador Comercial": [
    "quotes.view", "quotes.edit", "backlog_design.view",
    "special_designs.view", "special_designs.create",
  ],
  "Analista de Cartera": [
    "clients.view", "orders.view", "reports.bi_orders",
  ],
  "Analista de Pedido": [
    "orders.view", "orders.edit", "orders.approve_ingreso",
    "orders.approve_fabricacion", "orders.send_ofimatica", "reports.bi_orders",
  ],
  "Jefe de compra": [
    "orders.view", "reports.bi_orders", "parameters.view",
  ],
  Consultor: [
    "clients.view", "opportunities.view", "quotes.view", "orders.view",
    "reports.bi_quotes", "reports.bi_orders", "reports.bi_tracking",
  ],
};

async function main() {
  // Empresa (tenant)
  const company = await db.company.upsert({
    where: { id: "jep-mobiliari" },
    update: {},
    create: { id: "jep-mobiliari", name: "JEP Mobiliari" },
  });

  // Permisos
  for (const p of PERMISSIONS) {
    await db.permission.upsert({
      where: { key: p.key },
      update: { name: p.name },
      create: p,
    });
  }
  const allPerms = await db.permission.findMany();
  const permByKey = new Map(allPerms.map((p) => [p.key, p]));

  // Roles + asignaciones
  for (const r of ROLES) {
    const role = await db.role.upsert({
      where: { companyId_name: { companyId: company.id, name: r.name } },
      update: { seatLimit: r.seatLimit },
      create: { companyId: company.id, name: r.name, seatLimit: r.seatLimit },
    });

    const grant = GRANTS[r.name] ?? [];
    const keys = grant === "*" ? allPerms.map((p) => p.key) : grant;
    for (const key of keys) {
      const perm = permByKey.get(key);
      if (!perm) continue;
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: perm.id },
        },
        update: { active: true },
        create: { roleId: role.id, permissionId: perm.id, active: true },
      });
    }
  }

  // Usuarios de ejemplo (anonimizados)
  const roleByName = new Map(
    (await db.role.findMany({ where: { companyId: company.id } })).map((r) => [
      r.name,
      r,
    ])
  );

  const users: {
    name: string;
    email: string;
    role: string;
    cargo?: string;
    status?: "ACTIVE" | "INACTIVE";
  }[] = [
    { name: "Administrador Sistemas", email: "sistemas@jepmobiliari.com", role: "Administrador", cargo: "Administrador" },
    { name: "Asesora Demo", email: "asesor.demo@jepmobiliari.com", role: "Asesor", cargo: "Asesor de proyectos" },
    { name: "Diseñador Demo", email: "disenador.demo@jepmobiliari.com", role: "Diseñador", cargo: "Diseñador" },
    { name: "Consultor Demo", email: "consultor.demo@jepmobiliari.com", role: "Consultor", cargo: "Consultor", status: "INACTIVE" },
  ];

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  for (const u of users) {
    const role = roleByName.get(u.role);
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, roleId: role?.id, cargoActual: u.cargo, passwordHash },
      create: {
        companyId: company.id,
        name: u.name,
        email: u.email,
        roleId: role?.id,
        cargoActual: u.cargo,
        status: u.status ?? "ACTIVE",
        passwordHash,
      },
    });
  }

  // ── Parámetros (estados/enums como config JSON con icon/color) ──
  const PARAMETERS: { key: string; value: unknown }[] = [
    {
      key: "action_activities",
      value: [
        { id: "presentacion-virtual", value: "Presentación Virtual", icon: "fa-desktop", color: "green" },
        { id: "llamada", value: "Llamada", icon: "fa-phone", color: "green" },
        { id: "visita", value: "Visita", icon: "fa-location-arrow", color: "green" },
        { id: "email", value: "Email", icon: "fa-envelope", color: "green" },
        { id: "observacion", value: "Observación", icon: "fa-eye", color: "green" },
      ],
    },
    {
      key: "approved_types",
      value: [
        { id: "0", value: "PENDIENTE", color: "amber" },
        { id: "1", value: "APROBADO", color: "green" },
        { id: "2", value: "NO APROBADA", color: "red" },
        { id: "3", value: "DETENIDO", color: "muted" },
      ],
    },
    {
      key: "client_states",
      value: [
        { id: "prospecto", value: "Prospecto", color: "muted" },
        { id: "gestion", value: "Gestión Cotización", color: "amber" },
        { id: "cliente", value: "Cliente", color: "green" },
        { id: "perdida", value: "Gestión Perdida", color: "red" },
      ],
    },
  ];
  for (const p of PARAMETERS) {
    await db.parameter.upsert({
      where: { companyId_key: { companyId: company.id, key: p.key } },
      update: { value: p.value as object },
      create: { companyId: company.id, key: p.key, value: p.value as object },
    });
  }

  // ── Categorías (parametrizables por entidad) ──
  const CATEGORIES: { entity: string; name: string }[] = [
    { entity: "channel", name: "Página Web" },
    { entity: "channel", name: "Redes sociales" },
    { entity: "channel", name: "Teléfono" },
    { entity: "channel", name: "Correo" },
    { entity: "channel", name: "Whatsapp" },
    { entity: "client", name: "Cliente" },
    { entity: "client", name: "Prospecto" },
    { entity: "client", name: "Contacto" },
  ];
  for (const c of CATEGORIES) {
    await db.category.upsert({
      where: {
        companyId_entity_name: {
          companyId: company.id,
          entity: c.entity,
          name: c.name,
        },
      },
      update: {},
      create: { companyId: company.id, entity: c.entity, name: c.name },
    });
  }

  // ── Tags ──
  for (const name of ["Empleado", "Independiente", "Pensionado"]) {
    await db.tag.upsert({
      where: { companyId_name: { companyId: company.id, name } },
      update: {},
      create: { companyId: company.id, name },
    });
  }

  // ── Listas de precio ──
  for (const name of ["Usuario Final", "Distribuidor", "Institucional"]) {
    await db.priceList.upsert({ where: { name }, update: {}, create: { name } });
  }

  // ── Sectores y subsectores ──
  const SECTORS: { name: string; subs: string[] }[] = [
    { name: "CORPORATIVO", subs: ["MINERALES NO METALICOS", "SERVICIOS", "MANUFACTURA"] },
    { name: "INSTITUCIONAL", subs: ["EDUCACIÓN", "SALUD", "GOBIERNO"] },
    { name: "COMERCIAL", subs: ["RETAIL", "HOTELERÍA"] },
  ];
  for (const s of SECTORS) {
    const sector = await db.sector.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name },
    });
    for (const sub of s.subs) {
      await db.subSector.upsert({
        where: { sectorId_name: { sectorId: sector.id, name: sub } },
        update: {},
        create: { sectorId: sector.id, name: sub },
      });
    }
  }

  // ── Clientes de ejemplo (anonimizados) ──
  const asesor = roleByName.get("Asesor");
  const asesorUser = await db.user.findFirst({
    where: { companyId: company.id, roleId: asesor?.id },
  });
  const usuarioFinal = await db.priceList.findUnique({ where: { name: "Usuario Final" } });
  const corporativo = await db.sector.findUnique({ where: { name: "CORPORATIVO" } });

  const SAMPLE_CLIENTS = [
    { numero: 1, personType: "JURIDICA" as const, razonSocial: "Comercial Andina S.A.S", nombreComercial: "Andina", email: "contacto@ejemplo-andina.co", telefono: "+57 300 0000001", tipoDocumento: "NIT", numeroDocumento: "900000001-1", ciudad: "Medellín", canal: "Página Web", estado: "Cliente" },
    { numero: 2, personType: "JURIDICA" as const, razonSocial: "Inversiones del Valle Ltda", nombreComercial: "Del Valle", email: "info@ejemplo-valle.co", telefono: "+57 300 0000002", tipoDocumento: "NIT", numeroDocumento: "900000002-2", ciudad: "Cali", canal: "Redes sociales", estado: "Gestión Cotización" },
    { numero: 3, personType: "NATURAL" as const, nombres: "Cliente", apellidos: "Ejemplo Uno", email: "persona1@ejemplo.co", telefono: "+57 300 0000003", tipoDocumento: "CC", numeroDocumento: "1000000003", ciudad: "Bogotá", canal: "Whatsapp", estado: "Prospecto" },
    { numero: 4, personType: "JURIDICA" as const, razonSocial: "Muebles Corporativos S.A", nombreComercial: "MueblesCorp", email: "ventas@ejemplo-mc.co", telefono: "+57 300 0000004", tipoDocumento: "NIT", numeroDocumento: "900000004-4", ciudad: "Barranquilla", canal: "Teléfono", estado: "Cliente" },
    { numero: 5, personType: "JURIDICA" as const, razonSocial: "Distribuciones Norte S.A.S", nombreComercial: "Norte", email: "compras@ejemplo-norte.co", telefono: "+57 300 0000005", tipoDocumento: "NIT", numeroDocumento: "900000005-5", ciudad: "Bucaramanga", canal: "Correo", estado: "Gestión Perdida" },
    { numero: 6, personType: "NATURAL" as const, nombres: "Cliente", apellidos: "Ejemplo Dos", email: "persona2@ejemplo.co", telefono: "+57 300 0000006", tipoDocumento: "CC", numeroDocumento: "1000000006", ciudad: "Medellín", canal: "Página Web", estado: "Prospecto" },
  ];
  for (const c of SAMPLE_CLIENTS) {
    await db.client.upsert({
      where: { companyId_numero: { companyId: company.id, numero: c.numero } },
      update: {},
      create: {
        companyId: company.id,
        advisorId: asesorUser?.id,
        priceListId: usuarioFinal?.id,
        sectorId: corporativo?.id,
        pais: "Colombia",
        ultimaInteraccion: new Date(Date.now() - c.numero * 86400000),
        ...c,
      },
    });
  }

  const counts = {
    roles: await db.role.count(),
    permissions: await db.permission.count(),
    rolePermissions: await db.rolePermission.count(),
    users: await db.user.count(),
    parameters: await db.parameter.count(),
    categories: await db.category.count(),
    tags: await db.tag.count(),
    priceLists: await db.priceList.count(),
    sectors: await db.sector.count(),
    clients: await db.client.count(),
  };
  console.log("Seed completado:", counts);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
