import { formatCents, PAYMENT_METHOD_LABELS, type Order } from '@fastfood/shared';
import { escapeHtml as e, formatDateTime } from './format';

/** Abre o cupom em uma janela e chama a impressão do navegador. Retorna `false` se o pop-up foi bloqueado. */
export function printReceipt(order: Order, storeName = 'Lanchonete'): boolean {
  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return false;

  const rows = order.items
    .map(
      (i) =>
        `<tr><td>${i.quantity}x ${e(i.name)}</td><td class="r">${formatCents(i.unitPriceCents * i.quantity)}</td></tr>`,
    )
    .join('');

  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <title>Pedido #${order.number}</title>
    <style>
      body { font: 12px/1.4 monospace; width: 280px; margin: 0; padding: 8px; }
      .c { text-align: center; } .b { font-weight: bold; } .r { text-align: right; }
      hr { border: 0; border-top: 1px dashed #000; margin: 8px 0; }
      table { width: 100%; border-collapse: collapse; }
    </style></head><body>
    <div class="c b">${e(storeName.toUpperCase())}</div>
    <div class="c b" style="font-size:20px">SENHA ${order.number}</div>
    <div class="c">${formatDateTime(order.createdAt)}</div>
    <hr><div>Cliente: ${e(order.customer)}</div>
    ${order.note ? `<div>Obs: ${e(order.note)}</div>` : ''}
    <hr><table>${rows}</table><hr>
    <table>
      <tr><td class="b">TOTAL</td><td class="r b">${formatCents(order.totalCents)}</td></tr>
      <tr><td>Pagamento</td><td class="r">${e(PAYMENT_METHOD_LABELS[order.paymentMethod])}</td></tr>
    </table>
    <hr><div class="c">Obrigado pela preferência!</div>
    </body></html>`);
  win.document.close();
  win.onafterprint = () => win.close();
  win.focus();
  win.print();
  return true;
}
