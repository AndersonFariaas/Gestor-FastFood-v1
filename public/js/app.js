// ====== 1. SESSÃO ====== //
// A sessão fica num cookie httpOnly; o servidor valida o login e as permissões.
const currentPage = document.body.dataset.page || '';
let currentUser = null;

try { localStorage.removeItem('lanchonete_session'); } catch (e) { } // sessão antiga, anterior ao login no servidor

function loginUrl() {
    const file = window.location.pathname.split('/').pop() || 'index.html';
    return `login.html?redirect=${encodeURIComponent(file)}`;
}

async function logout() {
    try { await fetch('/api/logout', { method: 'POST' }); } finally { window.location.href = 'login.html'; }
}

function applySession(user) {
    currentUser = user;

    // Só injeta o botão de "Sair" se NÃO for a Cozinha e NÃO for o Painel.
    const headerTitle = document.querySelector('header h1');
    if (headerTitle && !document.getElementById('user-info-header') && currentPage !== 'cozinha' && currentPage !== 'painel') {
        headerTitle.insertAdjacentHTML('beforeend', `<div id="user-info-header" class="block text-sm font-normal text-gray-500 mt-1"><i class="ph ph-user"></i> ${esc(user.username)} (${user.role === 'admin' ? 'Gerente' : 'Operador'}) | <button type="button" class="text-red-500 hover:underline cursor-pointer">Sair</button></div>`);
        document.querySelector('#user-info-header button').onclick = logout;
    }

    // Esconde o que é exclusivo da gerência (o servidor também bloqueia essas ações).
    if (user.role !== 'admin') {
        document.querySelectorAll('[data-admin-only], #configModal a[href="cardapio.html"], #configModal a[href="fechamento.html"]').forEach(el => el.remove());

        // Reajusta o layout para o botão "Pedidos" não ficar pequeno no canto
        const gridBotoes = document.getElementById('gridBotoesConfig');
        if (gridBotoes) {
            gridBotoes.classList.remove('grid-cols-3');
            gridBotoes.classList.add('grid-cols-1');
        }
    }
}

// ====== 2. COMUNICAÇÃO COM O SERVIDOR ====== //
const socket = currentPage !== 'login' && typeof io !== 'undefined' ? io() : null;
let localDB = { products: [], orders: [] };

if (socket) {
    socket.on('connect_error', (err) => {
        if (err.message === 'unauthorized') window.location.href = loginUrl();
    });

    // O servidor encerrou a conexão (logout ou sessão inválida).
    socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect') window.location.href = loginUrl();
    });

    socket.on('session', (user) => {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => applySession(user));
        else applySession(user);
    });

    socket.on('sync', (serverDB) => {
        localDB = serverDB;
        window.dispatchEvent(new Event('dbchange'));
    });

    socket.on('orderAdded', (newOrder) => {
        if (localDB.orders.some(o => o.id === newOrder.id)) return;
        localDB.orders.push(newOrder);
        window.dispatchEvent(new Event('dbchange'));

        // 🔔 TOCA O SOM NA COZINHA!
        if (currentPage === 'cozinha') {
            const som = document.getElementById('somAlerta');
            if (som) {
                // Tenta tocar (o usuário precisa ter clicado na tela da cozinha pelo menos uma vez pro Chrome permitir)
                som.play().catch(e => console.log("Clique na tela da cozinha uma vez para habilitar o som!"));
            }
        }
    });

    socket.on('orderStatusChanged', (data) => {
        const order = localDB.orders.find(o => o.id === data.id);
        if (order) {
            order.status = data.status;
            window.dispatchEvent(new Event('dbchange'));
        }
    });
}

// Envia um evento e aguarda a confirmação do servidor. Rejeita com uma mensagem pronta para o usuário.
function request(event, payload) {
    return new Promise((resolve, reject) => {
        if (!socket || !socket.connected) return reject(new Error('Sem conexão com o servidor.'));
        socket.timeout(8000).emit(event, payload, (err, res) => {
            if (err) return reject(new Error('O servidor não respondeu. Tente novamente.'));
            if (!res || !res.ok) return reject(new Error(res?.message || 'Erro inesperado.'));
            resolve(res.data);
        });
    });
}

function loadDB() {
    return structuredClone(localDB);
}

// O servidor calcula preço, total e número da senha; aqui só mandamos os itens e quantidades.
async function sendNewOrder(payload) {
    const order = await request('newOrder', payload);
    // Manda imprimir automaticamente (se estiver ativado nas configurações)
    printReceipt(order);
    return order;
}

function changeOrderStatus(orderId, newStatus) {
    return request('updateOrderStatus', { id: orderId, status: newStatus }).catch(err => toast(err.message));
}

// ====== 3. FUNÇÕES UTILITÁRIAS ====== //
function money(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function esc(s) { return String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])) }

function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    // Guarda as classes que escondem o toast (cada página posiciona o seu)
    el._hiddenClasses ??= [...el.classList].filter(c => c.includes('translate-y') || c === 'opacity-0');

    const icon = document.createElement('i');
    icon.className = 'ph-fill ph-info';
    el.replaceChildren(icon, document.createTextNode(` ${msg}`));
    el.classList.remove(...el._hiddenClasses);
    clearTimeout(window._toast);
    window._toast = setTimeout(() => {
        el.classList.add(...el._hiddenClasses);
    }, 3000);
}

function statusLabel(s) { return ({ NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado' })[s] || s }

// ====== 4. MENU INTELIGENTE, MODAL E IMPRESSÃO ====== //
let configImpressora = { autoPrint: false };
try { configImpressora = JSON.parse(localStorage.getItem('lanchonete_printer')) || configImpressora; } catch (e) { }

// Garante que o HTML já carregou antes de colocar as animações
document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica do Modal de Configurações ---
    const btnConfig = document.getElementById('btnConfig');
    const configModal = document.getElementById('configModal');
    const fecharConfig = document.getElementById('fecharConfig');
    const printAutoCheckbox = document.getElementById('printAuto');

    if (btnConfig && configModal) {
        if (printAutoCheckbox) printAutoCheckbox.checked = configImpressora.autoPrint;

        btnConfig.onclick = () => configModal.classList.remove('hidden');
        fecharConfig.onclick = () => configModal.classList.add('hidden');
        configModal.onclick = (e) => { if (e.target === configModal) configModal.classList.add('hidden') };

        if (printAutoCheckbox) {
            printAutoCheckbox.onchange = (e) => {
                configImpressora.autoPrint = e.target.checked;
                localStorage.setItem('lanchonete_printer', JSON.stringify(configImpressora));
                toast(e.target.checked ? 'Impressão automática ativada!' : 'Impressão desativada.');
            };
        }
    }
});

// --- Função de Impressão ---
function printReceipt(order) {
    if (!configImpressora.autoPrint) return;
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return; // Se o navegador bloquear o popup, ignora
    printWindow.document.write(`
        <html>
        <head>
            <title>Cupom #${esc(order.number)}</title>
            <style>
                body { font-family: monospace; width: 300px; margin: 0; padding: 10px; font-size: 12px; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .line { border-bottom: 1px dashed #000; margin: 10px 0; }
                table { width: 100%; text-align: left; border-collapse: collapse; }
                th, td { padding: 2px 0; }
                .right { text-align: right; }
            </style>
        </head>
        <body>
            <div class="center bold">SISTEMA FAST-FOOD</div>
            <div class="center">Pedido #${esc(order.number)}</div>
            <div class="center">Data: ${new Date(order.createdAt).toLocaleString('pt-BR')}</div>
            <div class="line"></div>
            <div>Cliente: ${esc(order.customer)}</div>
            ${order.note ? `<div>Obs: ${esc(order.note)}</div>` : ''}
            <div class="line"></div>
            <table>
                ${order.items.map(i => `<tr><td>${esc(i.qty)}x ${esc(i.name)}</td><td class="right">${money(i.price * i.qty)}</td></tr>`).join('')}
            </table>
            <div class="line"></div>
            <table>
                <tr><td class="bold">TOTAL</td><td class="right bold">${money(order.total)}</td></tr>
                <tr><td>Pagamento</td><td class="right">${esc(order.paymentMethod)}</td></tr>
            </table>
            <div class="line"></div>
            <div class="center">Obrigado pela preferência!</div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
