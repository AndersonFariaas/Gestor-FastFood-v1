let db = loadDB();
const $ = id => document.getElementById(id);
const columns = [['NOVO', 'Novos'], ['EM_PREPARO', 'Em preparo'], ['PRONTO', 'Prontos']];

function next(status) { return status === 'NOVO' ? 'EM_PREPARO' : status === 'EM_PREPARO' ? 'PRONTO' : 'ENTREGUE' }
function getColColor(status) { return status === 'NOVO' ? 'border-blue-500' : status === 'EM_PREPARO' ? 'border-yellow-500' : 'border-green-500'; }
function getBtnClass(status) { return status === 'NOVO' ? 'bg-blue-600 hover:bg-blue-700 text-white' : status === 'EM_PREPARO' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'; }

function render() {
    db = loadDB();
    const active = db.orders.filter(o => !['ENTREGUE', 'CANCELADO'].includes(o.status));

    $('kds').innerHTML = columns.map(([st, title]) => {
        const list = active.filter(o => o.status === st);
        return `
        <section class="flex-1 flex flex-col bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <header class="bg-gray-900 px-5 py-3 border-b border-gray-700 flex justify-between items-center">
                <h2 class="text-lg font-bold text-gray-200 uppercase tracking-wide">${title}</h2>
                <span class="bg-gray-700 text-gray-300 font-bold px-3 py-1 rounded-full text-sm">${list.length}</span>
            </header>
            
            <div class="flex-1 p-4 overflow-y-auto space-y-4">
                ${list.length ? list.map(o => `
                    <article class="bg-gray-700 rounded-lg shadow-lg border-l-4 ${getColColor(st)} p-4 flex flex-col gap-3 animate-fade-in">
                        <div class="flex justify-between items-start border-b border-gray-600 pb-2">
                            <div>
                                <strong class="text-2xl font-black text-white leading-none">#${o.number}</strong>
                                <div class="text-gray-300 text-sm mt-1 font-medium"><i class="ph ph-user"></i> ${esc(o.customer)}</div>
                            </div>
                            <small class="text-gray-400 font-medium flex items-center gap-1"><i class="ph ph-clock"></i> ${new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
                        </div>
                        <ul class="space-y-2 text-gray-200 font-medium">
                            ${o.items.map(i => `<li class="flex gap-2"><b class="text-orange-400 bg-gray-800 px-1.5 rounded">${i.qty}x</b> <span>${esc(i.name)}</span></li>`).join('')}
                        </ul>
                        ${o.note ? `<div class="bg-gray-800 text-yellow-400 p-2 rounded text-sm italic font-medium mt-1"><i class="ph ph-warning-circle"></i> Obs: ${esc(o.note)}</div>` : ''}
                        <button class="w-full mt-2 py-3 rounded-lg font-bold text-lg shadow-md transition-colors ${getBtnClass(st)}" data-id="${o.id}">
                            ${next(st) === 'EM_PREPARO' ? 'Iniciar Preparo' : next(st) === 'PRONTO' ? 'Marcar como Pronto' : 'Entregar ao Cliente'}
                        </button>
                    </article>
                `).join('') : '<div class="h-full flex items-center justify-center text-gray-500 font-medium italic">Nenhum pedido</div>'}
            </div>
        </section>
        `;
    }).join('');

    document.querySelectorAll('article button').forEach(b => b.onclick = () => advance(b.dataset.id));
}

function advance(id) {
    const o = db.orders.find(x => x.id === id);
    if (!o) return;
    const newStatus = next(o.status);
    changeOrderStatus(id, newStatus);
    toast(`Pedido #${o.number}: ${statusLabel(newStatus)}`);
}

window.addEventListener('dbchange', render);
render();