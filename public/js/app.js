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
        document.querySelectorAll(`nav a[href="cardapio.html"], nav a[href="pedidos.html"], nav a[href="fechamento.html"]`).forEach(el => el.style.display = 'none');

        if (currentPage === 'cardapio' || currentPage === 'pedidos' || currentPage === 'fechamento') {
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
        if (currentPage === 'cozinha') {
            const som = document.getElementById('somAlerta');
            if (som) som.play().catch(e => console.log("Navegador bloqueou som", e));
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

function loadDB() { return structuredClone(localDB); }

function sendNewOrder(order) {
    if (socket) {
        socket.emit('newOrder', order);
        localDB.orders.push(order);
        window.dispatchEvent(new Event('dbchange'));
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
    window._toast = setTimeout(() => { el.classList.add('translate-y-20', 'opacity-0'); }, 3000);
}

function statusLabel(s) { return ({ NOVO: 'Novo', EM_PREPARO: 'Em preparo', PRONTO: 'Pronto', ENTREGUE: 'Entregue', CANCELADO: 'Cancelado' })[s] || s }