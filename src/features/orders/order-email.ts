// Correo "cotización aprobada → ingresar en ofimática" (medida transitoria
// mientras se habilita la inserción automática de la CV en el ERP; ver
// docs/INTEGRACION-OFIMATICA.md). Destinatario por ORDER_NOTIFY_EMAIL.

const money = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type OrderEmailData = {
  pedidoNumero: number;
  pedidoId: string;
  quoteNumero: number;
  clienteNombre: string;
  nit: string | null;
  telefono: string | null;
  emailCliente: string | null;
  asesor: string | null;
  formaPago: string | null;
  direccionEnvio: string | null;
  ordenCompra: string | null;
  items: {
    referencia: string | null;
    descripcion: string | null;
    acabados: string | null;
    /** Medidas de producto de área ("Largo 1,20 × Ancho 0,60 · Figura"). */
    medidas?: string | null;
    cantidad: number;
    precio: number;
    descuentoPct: number;
    total: number;
    /** Fila-sección de carátula: solo título y suma; sus productos siguen. */
    caratula?: boolean;
    /** Separador: fila de solo texto que secciona la cotización. */
    separador?: boolean;
  }[];
  subtotal: number;
  impuesto: number;
  total: number;
};

export function buildOrderEmail(d: OrderEmailData): { subject: string; html: string } {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const filas = d.items
    .map((it) =>
      it.separador
        ? `
      <tr style="background:#e5e7eb;">
        <td colspan="6" style="padding:6px 8px;border:1px solid #ddd;font-weight:700;text-transform:uppercase;">${esc(it.descripcion) || "—"}</td>
      </tr>`
        : it.caratula
        ? `
      <tr style="background:#f3f4f6;">
        <td colspan="5" style="padding:6px 8px;border:1px solid #ddd;font-weight:700;">CARÁTULA: ${esc(it.descripcion) || "—"}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:700;">${money.format(it.total)}</td>
      </tr>`
        : `
      <tr>
        <td style="padding:6px 8px;border:1px solid #ddd;">${esc(it.referencia) || "—"}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;">${esc(it.descripcion) || "—"}${
          it.acabados ? `<br><small style="color:#666;">${esc(it.acabados)}</small>` : ""
        }${
          it.medidas ? `<br><small style="color:#666;">${esc(it.medidas)}</small>` : ""
        }</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${it.cantidad}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${money.format(it.precio)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${it.descuentoPct}%</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:right;">${money.format(it.total)}</td>
      </tr>`
    )
    .join("");

  const dato = (label: string, value: string | null | undefined) =>
    `<tr><td style="padding:2px 8px;color:#666;">${label}</td><td style="padding:2px 8px;font-weight:600;">${esc(value) || "—"}</td></tr>`;

  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#222;max-width:720px;">
    <h2 style="margin:0 0 4px;">Cotización N° ${d.quoteNumero} aprobada — ingresar en ofimática</h2>
    <p style="margin:0 0 12px;color:#666;">Se generó el pedido N° ${d.pedidoNumero} en JEP-Hub. Ingresa la cotización en el ERP con estos datos.</p>
    <table style="border-collapse:collapse;margin-bottom:12px;">
      ${dato("Cliente", d.clienteNombre)}
      ${dato("NIT / Documento", d.nit)}
      ${dato("Teléfono", d.telefono)}
      ${dato("Email", d.emailCliente)}
      ${dato("Asesor", d.asesor)}
      ${dato("Forma de pago", d.formaPago)}
      ${dato("Dirección de envío", d.direccionEnvio)}
      ${dato("Orden de compra", d.ordenCompra)}
    </table>
    <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Referencia</th>
          <th style="padding:6px 8px;border:1px solid #ddd;text-align:left;">Descripción</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Cant.</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Precio</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Dcto.</th>
          <th style="padding:6px 8px;border:1px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
      <tfoot>
        <tr><td colspan="5" style="padding:4px 8px;text-align:right;color:#666;">Subtotal</td><td style="padding:4px 8px;text-align:right;">${money.format(d.subtotal)}</td></tr>
        <tr><td colspan="5" style="padding:4px 8px;text-align:right;color:#666;">IVA</td><td style="padding:4px 8px;text-align:right;">${money.format(d.impuesto)}</td></tr>
        <tr><td colspan="5" style="padding:4px 8px;text-align:right;font-weight:700;">Total</td><td style="padding:4px 8px;text-align:right;font-weight:700;">${money.format(d.total)}</td></tr>
      </tfoot>
    </table>
    <p>
      <a href="${appUrl}/pedidos/${d.pedidoId}" style="color:#12A2BC;">Ver pedido en JEP-Hub</a>
    </p>
  </div>`;

  return {
    subject: `Cotización N° ${d.quoteNumero} aprobada — ingresar en ofimática (Pedido N° ${d.pedidoNumero})`,
    html,
  };
}
