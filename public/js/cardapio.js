let db = loadDB();
const $ = id => document.getElementById(id);
const modal = $('modal');

function render() {
    db = loadDB();
    const cats = [...new Set(db.products.map(p => p.category))].sort();
    $('filtroCategoria').innerHTML = '<option value="">Todas as categorias</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');

    const q = $('filtroCardapio').value.toLowerCase(), cat = $('filtroCategoria').value;
    const ps = db.products.filter(p => (!q || p.name.toLowerCase().includes(q)) && (!cat || p.category === cat));

    $('tabelaProdutos').innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-gray-50 border-b border-gray-200">
                    <th class="p-4 font-semibold text-gray-600">Item</th><th class="p-4 font-semibold text-gray-600">Categoria</th>
                    <th class="p-4 font-semibold text-gray-600">Preço</th><th class="p-4 font-semibold text-gray-600">Status</th>
                    <th class="p-4 font-semibold text-gray-600 text-right">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${ps.map(p => `
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td class="p-4"><strong class="block text-gray-900">${esc(p.name)}</strong><small class="text-gray-500">${esc(p.description || '')}</small></td>
                        <td class="p-4 text-gray-600">${esc(p.category)}</td><td class="p-4 font-bold text-gray-900">${money(p.price)}</td>
                        <td class="p-4"><span class="px-2 py-1 text-xs font-bold rounded ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${p.active ? 'Disponível' : 'Indisponível'}</span></td>
                        <td class="p-4 text-right space-x-2"><button class="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded font-medium transition-colors" data-edit="${p.id}">Editar</button><button class="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded font-medium transition-colors" data-del="${p.id}">Excluir</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${ps.length === 0 ? '<div class="p-8 text-center text-gray-500">Nenhum produto encontrado.</div>' : ''}
    `;

    document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openEdit(b.dataset.edit));
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => del(b.dataset.del));
}

function openEdit(id) {
    const p = id ? db.products.find(x => x.id === id) : null;
    $('modalTitulo').textContent = p ? 'Editar item' : 'Novo item';
    $('produtoId').value = p?.id || '';
    $('produtoNome').value = p?.name || ''; $('produtoPreco').value = p?.price ?? '';
    $('produtoCategoria').value = p?.category || '';
    $('produtoDescricao').value = p?.description || ''; $('produtoAtivo').checked = p?.active ?? true;
    modal.classList.remove('hidden'); $('produtoNome').focus();
}

function close() { modal.classList.add('hidden') }

$('novoProduto').onclick = () => openEdit(); $('fecharModal').onclick = close; $('cancelar').onclick = close;
modal.onclick = e => { if (e.target === modal) close() };

let timerBuscaProd;
$('filtroCardapio').oninput = () => { clearTimeout(timerBuscaProd); timerBuscaProd = setTimeout(render, 300); };
$('filtroCategoria').onchange = render;

$('produtoForm').onsubmit = e => {
    e.preventDefault();
    const id = $('produtoId').value;
    const data = { name: $('produtoNome').value.trim(), price: Number($('produtoPreco').value), category: $('produtoCategoria').value.trim(), description: $('produtoDescricao').value.trim(), active: $('produtoAtivo').checked };
    if (!data.name || !data.category || data.price < 0) return;

    if (id) {
        const productData = { id, ...data };
        Object.assign(db.products.find(p => p.id === id), productData);
        if (socket) socket.emit('updateProduct', productData);
        toast('Item atualizado com sucesso!');
    } else {
        const newProduct = { id: uid('prod'), ...data };
        db.products.push(newProduct);
        if (socket) socket.emit('addProduct', newProduct);
        toast('Novo item criado com sucesso!');
    }
    close(); render();
};

function del(id) {
    const p = db.products.find(x => x.id === id);
    if (!p) return;
    if (confirm(`Tem certeza que deseja excluir "${p.name}"?`)) {
        db.products = db.products.filter(x => x.id !== id);
        if (socket) socket.emit('deleteProduct', id);
        render(); toast('Item excluído com sucesso.');
    }
}
window.addEventListener('dbchange', render);
render();