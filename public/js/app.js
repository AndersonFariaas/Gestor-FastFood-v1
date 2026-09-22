// ====== 1. SISTEMA DE SEGURANÇA E SESSÃO ====== //
const currentPage = document.body.dataset ? document.body.dataset.page : '';
let session = null;

// Tenta ler a sessão; se estiver corrompida, limpa para não travar o sistema
try {
    session = JSON.parse(localStorage.getItem('lanchonete_session'));
} catch (e) {
    localStorage.removeItem('lanchonete_session');
}

let currentFile = window.location.pathname.split('/').pop();
if (currentFile === '' || currentFile === '/') currentFile = 'index.html';

// Barreira 1: Se não tem sessão e não está no login, redireciona
if (!session && currentPage !== 'login') {
    window.location.href = `login.html?redirect=${currentFile}`;
}

// Barreira 2: Controle de interface para quem está logado
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
// =========================================== //

// ====== 2. COMUNICAÇÃO COM O SERVIDOR ====== //
// Proteção: Só tenta conectar se o script do Socket.io existir na página
const socket = typeof io !== 'undefined' ? io() : null;
let localDB = { products: [], orders: [] };

if (socket) {
    socket.on('sync', (serverDB) => {
        localDB = serverDB;
        window.dispatchEvent(new Event('dbchange'));
    });
} else {
    console.error("ATENÇÃO: Socket.io não encontrado. Verifique a tag <script src='/socket.io/socket.io.js'> no seu HTML.");
}

function loadDB() {
    return structuredClone(localDB);
}

function saveDB(db) {
    localDB = structuredClone(db);
    if (socket) socket.emit('updateDB', localDB);
    window.dispatchEvent(new Event('dbchange'));
}
// =========================================== //

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