// Cliente del ERP "ofimática". El contrato real (API/DB/archivos) aún no está
// definido (ver Riesgos en PLAN-IMPLEMENTACION.md), así que se usa un cliente
// simulado detrás de esta interfaz para que el resto del pipeline sea real y el
// cliente real se pueda enchufar sin tocar cola/worker/webhook.

export type ErpOrderInput = {
  id: string;
  numero: number;
  quoteNumero: number | null;
  total: number;
};

export type ErpSendResult = {
  nPedidoOfimatica: string;
  identificadorCotizacion: string;
  fechaCreacion: string; // ISO
};

export interface ErpClient {
  sendOrder(order: ErpOrderInput): Promise<ErpSendResult>;
}

/** Implementación simulada: genera identificadores y una fecha de creación. */
export class MockErpClient implements ErpClient {
  async sendOrder(order: ErpOrderInput): Promise<ErpSendResult> {
    // Latencia simulada del ERP.
    await new Promise((r) => setTimeout(r, 300));
    const yy = String(new Date().getFullYear()).slice(2);
    return {
      nPedidoOfimatica: `OF-${order.numero}${yy}`,
      identificadorCotizacion: order.quoteNumero ? `CTZ-${order.quoteNumero}` : `PED-${order.numero}`,
      fechaCreacion: new Date().toISOString(),
    };
  }
}

export function getErpClient(): ErpClient {
  // En el futuro: devolver el cliente real si hay credenciales configuradas.
  return new MockErpClient();
}
