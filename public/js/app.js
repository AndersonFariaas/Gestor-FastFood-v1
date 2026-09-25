// ====== 1. SISTEMA DE SEGURANÇA E SESSÃO ====== //
const currentPage = document.body.dataset ? document.body.dataset.page : '';
let session = null;

try {
    session = JSON.parse(localStorage.getItem('lanchonete_session'));
} catch (e) {
    localStorage.removeItem('lanchonete_session');
}

let currentFile = window.location.pathname.split('/').pop();
if (currentFile === '' || currentFile === '/') currentFile = 'index.html';

if (!session && currentPage !== 'login') {
    window.location.href = `login.html?redirect=${currentFile}`;
}

if (session && currentPage !== 'login') {
    const headerTitle = document.querySelector('header h1');
    if (headerTitle && !document.getElementById('user-info-header')) {
        headerTitle.innerHTML += `<div id="user-info-header" class="block text-sm font-normal text-gray-500 mt-1"><i class="ph ph-user"></i> ${session.username} (${session.role === 'admin' ? 'Gerente' : 'Operador'}) | <button onclick="logout()" class="text-red-500 hover:underline cursor-pointer">Sair</button></div>`;
    }

    if (session.role === 'user') {
        if (currentPage === 'cardapio' || currentPage === 'fechamento') {
            alert('Acesso negado. Área restrita à gerência.');
            window.location.href = 'index.html';
        }
    }
}

function logout() {
    localStorage.removeItem('lanchonete_session');
    window.location.href = 'login.html';
}

// ====== 2. COMUNICAÇÃO COM O SERVIDOR ====== //
const socket = typeof io !== 'undefined' ? io() : null;
let localDB = { products: [], orders: [] };

if (socket) {
    socket.on('sync', (serverDB) => {
        localDB = serverDB;
        window.dispatchEvent(new Event('dbchange'));
    });

    socket.on('orderAdded', (newOrder) => {
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

function loadDB() {
    return structuredClone(localDB);
}

function sendNewOrder(order) {
    if (socket) {
        socket.emit('newOrder', order);
        localDB.orders.push(order);
        window.dispatchEvent(new Event('dbchange'));

        // Manda imprimir automaticamente (se estiver ativado nas configurações)
        printReceipt(order);
    }
}

function changeOrderStatus(orderId, newStatus) {
    if (socket) {
        socket.emit('updateOrderStatus', { id: orderId, status: newStatus });
        const order = localDB.orders.find(o => o.id === orderId);
        if (order) order.status = newStatus;
        window.dispatchEvent(new Event('dbchange'));
    }
}

// ====== 3. FUNÇÕES UTILITÁRIAS ====== //
function money(v) { return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function uid(prefix = 'id') { return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7) }
function esc(s) { return String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])) }

function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = `<i class="ph-fill ph-info"></i> ${msg}`;
    el.classList.remove('translate-y-20', 'opacity-0');
    clearTimeout(window._toast);
    window._toast = setTimeout(() => {
        el.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function statusLabel(s) { return ({ NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado' })[s] || s }

// ====== 4. MENU INTELIGENTE, MODAL E IMPRESSÃO ====== //
let configImpressora = JSON.parse(localStorage.getItem('lanchonete_printer')) || { autoPrint: false };

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

        // Bloqueia ícones do painel administrativo se o operador for comum
        if (session && session.role === 'user') {
            document.querySelectorAll('#configModal a[href="cardapio.html"], #configModal a[href="fechamento.html"]').forEach(el => el.style.display = 'none');
            
            // Reajusta o layout para o botão "Pedidos" não ficar pequeno no canto
            const gridBotoes = document.getElementById('gridBotoesConfig');
            if (gridBotoes) {
                gridBotoes.classList.remove('grid-cols-3');
                gridBotoes.classList.add('grid-cols-1');
            }
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
            <title>Cupom #${order.number}</title>
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
            <div class="center">Pedido #${order.number}</div>
            <div class="center">Data: ${new Date(order.createdAt).toLocaleString('pt-BR')}</div>
            <div class="line"></div>
            <div>Cliente: ${order.customer}</div>
            ${order.note ? `<div>Obs: ${order.note}</div>` : ''}
            <div class="line"></div>
            <table>
                ${order.items.map(i => `<tr><td>${i.qty}x${i.name}</td><td class="right">${money(i.price * i.qty)}</td></tr>`).join('')}
            </table>
            <div class="line"></div>
            <table>
                <tr><td class="bold">TOTAL</td><td class="right bold">${money(order.total)}</td></tr>
                <tr><td>Pagamento</td><td class="right">${order.paymentMethod}</td></tr>
            </table>
            <div class="line"></div>
            <div class="center">Obrigado pela preferência!</div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}