let db = loadDB(), cart = [], category = '';
const $ = id => document.getElementById(id);

function renderCats() {
    const cats = [...new Set(db.products.filter(p => p.active).map(p => p.category))];

    $('categorias').innerHTML = `
        <button class="px-4 py-2 rounded-full font-medium text-sm transition-colors border ${!category ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}" data-cat="">Todos</button>
        ${cats.map(c => `<button class="px-4 py-2 rounded-full font-medium text-sm transition-colors border ${category === c ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
    `;

    document.querySelectorAll('#categorias button').forEach(b => b.onclick = () => {
        category = b.dataset.cat;
        render();
    });
}

function renderProducts() {
    const q = $('buscaProduto').value.toLowerCase();
    const ps = db.products.filter(p => p.active && (!category || p.category === category) && p.name.toLowerCase().includes(q));

    $('produtos').innerHTML = ps.length ? ps.map(p => `
        <button class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-orange-500 hover:shadow-md transition-all text-left flex flex-col justify-between gap-3 group" data-id="${p.id}">
            <div>
                <span class="inline-block bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded font-semibold mb-2">${esc(p.category)}</span>
                <strong class="block text-gray-800 text-lg leading-tight mb-1 group-hover:text-orange-600 transition-colors">${esc(p.name)}</strong>
                <small class="block text-gray-500 text-sm line-clamp-2">${esc(p.description || '')}</small>
            </div>
            <b class="text-orange-500 text-xl font-black mt-2">${money(p.price)}</b>
        </button>
    `).join('') : '<div class="col-span-full flex flex-col items-center justify-center p-10 text-gray-400"><i class="ph ph-mask-sad text-4xl mb-2"></i><p>Nenhum item encontrado.</p></div>';

    document.querySelectorAll('#produtos button').forEach(b => b.onclick = () => add(b.dataset.id));
}

function add(id) {
    const p = db.products.find(x => x.id === id), item = cart.find(x => x.id === id);
    if (item) item.qty++;
    else cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
    renderCart();
}

function change(id, d) {
    const i = cart.find(x => x.id === id);
    if (!i) return;
    i.qty += d;
    if (i.qty <= 0) cart = cart.filter(x => x.id !== id);
    renderCart();
}

function renderCart() {
    const box = $('pedidoItens');

    if (!cart.length) {
        box.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-gray-400"><i class="ph ph-receipt text-5xl mb-3"></i><p>Nenhum item adicionado.</p></div>';
    } else {
        box.innerHTML = cart.map(i => `
            <div class="flex flex-col bg-white border border-gray-100 rounded-xl p-3 shadow-sm relative group">
                <div class="flex justify-between items-start mb-2">
                    <div class="pr-6">
                        <strong class="text-gray-800 text-sm block leading-tight">${esc(i.name)}</strong>
                        <small class="text-gray-500">${money(i.price)} cada</small>
                    </div>
                    <strong class="text-gray-900">${money(i.price * i.qty)}</strong>
                </div>
                <div class="flex items-center justify-between bg-gray-50 rounded-lg p-1 w-24">
                    <button class="w-7 h-7 flex items-center justify-center bg-white rounded text-gray-600 shadow-sm hover:text-orange-600" data-act="dec" data-id="${i.id}">
                        <i class="ph ph-minus"></i>
                    </button>
                    <b class="text-sm font-bold w-6 text-center">${i.qty}</b>
                    <button class="w-7 h-7 flex items-center justify-center bg-white rounded text-gray-600 shadow-sm hover:text-orange-600" data-act="inc" data-id="${i.id}">
                        <i class="ph ph-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    box.querySelectorAll('button[data-act]').forEach(b => b.onclick = () => change(b.dataset.id, b.dataset.act === 'inc' ? 1 : -1));

    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    $('total').textContent = money(total); $('enviarPedido').disabled = !cart.length;
}

function send() {
    if (!cart.length) return;
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const elPagamento = $('pagamento');

    const order = {
        id: uid('ped'),
        number: db.orders.length ? Math.max(...db.orders.map(o => o.number)) + 1 : 1,
        createdAt: new Date().toISOString(),
        status: 'NOVO',
        customer: $('cliente').value.trim() || 'Balcão',
        note: $('observacao').value.trim(),
        items: cart.map(i => ({ ...i })),
        total,
        paymentMethod: elPagamento ? elPagamento.value : 'Dinheiro'
    };

    sendNewOrder(order);

    cart = [];
    $('cliente').value = '';
    $('observacao').value = '';
    renderCart();
    toast(`Pedido #${order.number} enviado para a cozinha!`);
}

function render() { db = loadDB(); renderCats(); renderProducts(); renderCart(); }

let timerBusca;
$('buscaProduto').addEventListener('input', () => {
    clearTimeout(timerBusca);
    timerBusca = setTimeout(renderProducts, 300);
});

$('limparPedido').onclick = () => { cart = []; renderCart(); };
$('enviarPedido').onclick = send;
window.addEventListener('dbchange', render);
render();