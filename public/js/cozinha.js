const kds = document.getElementById('kds');

// A cozinha agora foca apenas no que importa: O que fazer e O que está sendo feito.
const colunasCozinha = [
    { id: 'NOVO', titulo: 'Novos Pedidos', cor: 'blue' },
    { id: 'EM_PREPARO', titulo: 'Em Preparo', cor: 'yellow' }
];

function renderCozinha() {
    const db = loadDB();
    kds.innerHTML = '';

    colunasCozinha.forEach(coluna => {
        // Filtra apenas os pedidos desta coluna
        const pedidos = db.orders.filter(o => o.status === coluna.id);

        const colDiv = document.createElement('div');
        colDiv.className = 'flex-1 bg-gray-800 rounded-xl flex flex-col overflow-hidden border border-gray-700 shadow-lg';

        colDiv.innerHTML = `
            <div class="bg-${coluna.cor}-600 px-4 py-3 font-bold text-white flex justify-between items-center shadow-md">
                <span class="uppercase tracking-wider">${coluna.titulo}</span>
                <span class="bg-black bg-opacity-30 px-3 py-1 rounded-full text-sm">${pedidos.length}</span>
            </div>
            <div class="p-4 flex-1 overflow-y-auto space-y-4 bg-gray-800">
                ${pedidos.map(p => criarCardPedido(p)).join('')}
            </div>
        `;
        kds.appendChild(colDiv);
    });
}

function criarCardPedido(order) {
    const tempo = Math.floor((new Date() - new Date(order.createdAt)) / 60000);
    const atrasado = tempo > 15; // Fica vermelho se passar de 15 minutos

    let botoes = '';
    if (order.status === 'NOVO') {
        botoes = `<button onclick="changeOrderStatus('${order.id}', 'EM_PREPARO')" class="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-bold transition-colors">Preparar</button>`;
    } else if (order.status === 'EM_PREPARO') {
        // Quando clicar aqui, vai para PRONTO, some da cozinha e toca a TV!
        botoes = `<button onclick="changeOrderStatus('${order.id}', 'PRONTO')" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-colors"><i class="ph-bold ph-check"></i> Finalizar (Pronto)</button>`;
    }

    return `
        <div class="bg-gray-700 p-4 rounded-xl border-l-4 ${atrasado ? 'border-red-500' : 'border-gray-500'} shadow-md">
            <div class="flex justify-between items-start mb-3 border-b border-gray-600 pb-2">
                <div>
                    <strong class="text-2xl text-white block">#${order.number}</strong>
                    <span class="text-gray-400 text-sm">${order.customer || 'Balcão'}</span>
                </div>
                <span class="text-sm font-medium px-2 py-1 rounded-md ${atrasado ? 'bg-red-500/20 text-red-400' : 'bg-gray-600 text-gray-300'}">
                    <i class="ph-bold ph-clock"></i> ${tempo} min
                </span>
            </div>
            
            <ul class="space-y-2 mb-4 text-gray-200">
                ${order.items.map(i => `
                    <li class="flex gap-2 text-lg">
                        <strong class="text-white">${i.qty}x</strong> 
                        <span>${esc(i.name)}</span>
                    </li>
                `).join('')}
            </ul>
            
            ${order.note ? `<div class="bg-gray-800 p-3 rounded-lg text-orange-400 text-sm mb-4 border border-gray-600"><i class="ph-bold ph-warning-circle"></i> Obs: ${esc(order.note)}</div>` : ''}
            
            <div class="flex gap-2 mt-4">
                ${botoes}
            </div>
        </div>
    `;
}

// Atualiza a cada minuto para o contador de tempo não parar
setInterval(renderCozinha, 60000);
window.addEventListener('dbchange', renderCozinha);
renderCozinha();