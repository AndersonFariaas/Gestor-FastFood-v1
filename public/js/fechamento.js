let db = loadDB();
const $ = id => document.getElementById(id);

function renderFechamento() {
    db = loadDB();
    const allOrders = db.orders;

    const cancelados = allOrders.filter(o => o.status === 'CANCELADO');
    const concluidos = allOrders.filter(o => o.status !== 'CANCELADO');

    const totalFaturamento = concluidos.reduce((acc, o) => acc + o.total, 0);
    $('valFaturamento').innerText = money(totalFaturamento);
    $('valVendas').innerText = concluidos.length;
    $('valCancelados').innerText = cancelados.length;

    const pagamentos = { 'PIX': 0, 'Cartão de Crédito': 0, 'Cartão de Débito': 0, 'Dinheiro': 0, 'Vale Alimentação/Refeição': 0 };

    concluidos.forEach(o => {
        const metodo = o.paymentMethod || 'Dinheiro';
        if (pagamentos[metodo] !== undefined) pagamentos[metodo] += o.total;
        else pagamentos['Dinheiro'] += o.total;
    });

    const icones = { 'PIX': 'ph-intersect', 'Cartão de Crédito': 'ph-credit-card', 'Cartão de Débito': 'ph-credit-card', 'Dinheiro': 'ph-money', 'Vale Alimentação/Refeição': 'ph-ticket' };

    $('gridPagamentos').innerHTML = Object.keys(pagamentos).map(metodo => `
        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <div class="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-3">
                <i class="ph ${icones[metodo]} text-2xl"></i>
            </div>
            <strong class="text-gray-800 text-sm leading-tight h-10 flex items-center">${metodo}</strong>
            <span class="text-xl font-black text-green-600 mt-2">${money(pagamentos[metodo])}</span>
        </div>
    `).join('');
}

$('btnEncerrarCaixa').onclick = () => {
    if (confirm('ATENÇÃO: Encerrar o caixa vai ocultar todos os pedidos de hoje das telas de preparo e zerar os contadores. Deseja confirmar?')) {
        if (socket) socket.emit('closeRegister');
        toast('Turno encerrado. Caixa zerado com sucesso.');
    }
};

window.addEventListener('dbchange', renderFechamento);
renderFechamento();