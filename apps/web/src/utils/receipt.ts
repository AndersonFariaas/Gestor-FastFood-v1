import { DEFAULT_CUSTOMER, formatCents, PAYMENT_METHOD_LABELS, type Order } from '@fastfood/shared';
import { escapeHtml as e, formatDateTime } from './format';

export interface CashInfo {
  receivedCents: number | null;
  changeCents: number | null;
}

const row = (label: string, value: string, cls = '') =>
  `<tr class="${cls}"><td>${label}</td><td class="r">${value}</td></tr>`;

/**
 * Comprovante do pedido para impressora térmica de 80 mm.
 * Não é documento fiscal: a emissão de NFC-e exige integração com a SEFAZ.
 */
export function buildReceiptHtml(order: Order, cash?: CashInfo, storeName = 'Lanchonete'): string {
  const items = order.items
    .map(
      (i) => `<tr>
        <td class="q">${i.quantity}x</td>
        <td>${e(i.name)}<br><small>${formatCents(i.unitPriceCents)} un.</small></td>
        <td class="r">${formatCents(i.unitPriceCents * i.quantity)}</td>
      </tr>`,
    )
    .join('');

  const hasCash = typeof cash?.receivedCents === 'number' && typeof cash.changeCents === 'number';

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido ${order.number}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: 72mm; margin: 0 auto; padding: 4mm 0; font: 12px/1.35 'Courier New', monospace; color: #000; }
  .c { text-align: center; } .r { text-align: right; white-space: nowrap; } .b { font-weight: bold; }
  h1 { margin: 0; font-size: 16px; } h2 { margin: 2px 0 0; font-size: 11px; font-weight: normal; letter-spacing: 1px; }
  .senha { margin: 6px 0; padding: 4px 0; border: 2px solid #000; }
  .senha small { display: block; font-size: 11px; letter-spacing: 3px; }
  .senha strong { display: block; font-size: 40px; line-height: 1; }
  hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  td.q { width: 9mm; font-weight: bold; }
  small { font-size: 10px; }
  .total td { font-size: 15px; font-weight: bold; padding-top: 3px; }
  .troco td { font-size: 14px; font-weight: bold; }
</style></head><body>
  <div class="c">
    <h1>${e(storeName.toUpperCase())}</h1>
    <h2>COMPROVANTE DE PEDIDO</h2>
    <div class="senha"><small>SENHA</small><strong>${order.number}</strong></div>
    ${order.customer !== DEFAULT_CUSTOMER ? `<div class="b">${e(order.customer)}</div>` : ''}
    <div>${formatDateTime(order.createdAt)}</div>
  </div>
  <hr>
  <table>${items}</table>
  ${order.note ? `<hr><div><b>Obs:</b> ${e(order.note)}</div>` : ''}
  <hr>
  <table>
    ${row('TOTAL', formatCents(order.totalCents), 'total')}
    ${row('Pagamento', e(PAYMENT_METHOD_LABELS[order.paymentMethod]))}
    ${hasCash ? row('Valor recebido', formatCents(cash!.receivedCents!)) : ''}
    ${hasCash ? row('TROCO', formatCents(cash!.changeCents!), 'troco') : ''}
  </table>
  <hr>
  <div class="c"><small>Não é documento fiscal</small><br>Obrigado pela preferência!</div>
</body></html>`;
}

/**
 * Imprime o comprovante por um iframe oculto (sem pop-up, então não é bloqueado pelo navegador).
 * Com o Chrome aberto em `--kiosk-printing`, sai direto na impressora padrão, sem a caixa de diálogo.
 */
export function printReceipt(order: Order, cash?: CashInfo): boolean {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    return false;
  }

  doc.open();
  doc.write(buildReceiptHtml(order, cash));
  doc.close();

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    frame.remove();
  };
  win.addEventListener('afterprint', () => setTimeout(cleanup, 100));
  setTimeout(cleanup, 60_000); // garantia caso o navegador não dispare `afterprint`

  try {
    win.focus();
    win.print();
    return true;
  } catch {
    cleanup();
    return false;
  }
}
