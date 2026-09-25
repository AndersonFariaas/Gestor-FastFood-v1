let db = loadDB();
const $ = id => document.getElementById(id);

function getStatusBadge(s) {
    const colors = { NOVO: 'bg-blue-100 text-blue-700', EM_PREPARO: 'bg-yellow-100 text-yellow-700', PRONTO: 'bg-orange-100 text-orange-700', ENTREGUE: 'bg-green-100 text-green-700', CANCELADO: 'bg-red-100 text-red-700' };
    return `<span class="px-2 py-1 text-xs font-bold rounded ${colors[s] || 'bg-gray-100 text-gray-700'}">${statusLabel(s)}</span>`;
}

function render() {
    db = loadDB();
    const all = db.orders;
    const validOrders = all.filter(o => o.status !== 'CANCELADO');
    const total = validOrders.reduce((s, o) => s + o.total, 0);

    $('stats').innerHTML = `
        <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div><small class="text-gray-500 font-medium">Total de Pedidos</small><strong class="block text-3xl font-black text-gray-900 mt-1">${all.length}</strong></div>
            <div class="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-2xl"><i class="ph ph-receipt"></i></div>
        </div>
        <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div><small class="text-gray-500 font-medium">Em andamento</small><strong class="block text-3xl font-black text-gray-900 mt-1">${all.filter(o => !['ENTREGUE', 'CANCELADO'].includes(o.status)).length}</strong></div>
            <div class="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center text-2xl"><i class="ph ph-cooking-pot"></i></div>
        </div>
        <div class="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div><small class="text-gray-500 font-medium">Faturamento Válido</small><strong class="block text-3xl font-black text-green-600 mt-1">${money(total)}</strong></div>
            <div class="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-2xl"><i class="ph ph-currency-dollar"></i></div>
        </div>
    `;

    $('historico').innerHTML = all.length ? `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                    <th class="p-4 font-semibold text-gray-600">Pedido</th><th class="p-4 font-semibold text-gray-600">Data e Hora</th>
                    <th class="p-4 font-semibold text-gray-600">Cliente</th><th class="p-4 font-semibold text-gray-600">Itens</th>
                    <th class="p-4 font-semibold text-gray-600">Status</th><th class="p-4 font-semibold text-gray-600">Total</th>
                </tr>
            </thead>
            <tbody>
                ${[...all].reverse().map(o => `
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td class="p-4"><strong class="text-gray-900">#${o.number}</strong></td>
                        <td class="p-4 text-gray-500 text-sm">${new Date(o.createdAt).toLocaleString('pt-BR')}</td>
                        <td class="p-4 text-gray-800 font-medium">${esc(o.customer)}</td>
                        <td class="p-4 text-gray-500 text-sm max-w-xs truncate" title="${o.items.map(i => `${i.qty}× ${esc(i.name)}`).join(', ')}">${o.items.map(i => `${i.qty}× ${esc(i.name)}`).join(', ')}</td>
                        <td class="p-4">${getStatusBadge(o.status)}</td>
                        <td class="p-4"><strong class="text-gray-900">${money(o.total)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    ` : '<div class="p-10 text-center text-gray-500 flex flex-col items-center"><i class="ph ph-tray text-4xl mb-2"></i>Nenhum pedido registrado ainda.</div>';
}

$('limparHistorico').onclick = () => {
    if (confirm('Atenção: Tem certeza que deseja excluir todo o histórico de pedidos? Esta ação não pode ser desfeita.')) {
        if (socket) socket.emit('clearOrders');
        toast('Histórico apagado com sucesso.');
    }
};

window.addEventListener('dbchange', render);
render();