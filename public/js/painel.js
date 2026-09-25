const $ = id => document.getElementById(id);
let ultimoPedidoChamado = null;

function render() {
    const db = loadDB();

    // --- 1. SEPARA AS LISTAS ---
    const prontos = db.orders.filter(o => o.status === 'PRONTO').reverse();
    const emPreparo = db.orders.filter(o => o.status === 'EM_PREPARO').reverse();

    // --- 2. DESTAQUE E ALERTA SONORO ---
    if (prontos.length > 0) {
        const atual = prontos[0];

        $('senhaAtual').textContent = atual.number;
        $('clienteAtual').textContent = atual.customer || 'Balcão';

        if (ultimoPedidoChamado !== atual.id) {
            ultimoPedidoChamado = atual.id;
            tocarAlerta();
        }
    } else {
        $('senhaAtual').textContent = '--'; $('clienteAtual').textContent = 'Aguardando...';
        ultimoPedidoChamado = null;
    }

    // --- 3. PREENCHE O GRID DE PRONTOS (Remove o 1º pois já está no destaque) ---
    // Pega até 12 senhas prontas para exibir na grade
    const historicoProntos = prontos.slice(1, 13);
    $('gridProntos').innerHTML = historicoProntos.map(o => `
        <div class="bg-green-900/20 border border-green-700/50 rounded-xl p-4 flex flex-col items-center justify-center shadow-lg">
            <span class="text-4xl font-black text-green-400">#${o.number}</span>
            <span class="text-sm text-gray-300 truncate w-full text-center mt-1">${esc(o.customer || 'Balcão')}</span>
        </div>
    `).join('');

    // --- 4. PREENCHE O GRID DE EM PREPARO ---
    // Pega até 12 senhas em preparo
    const historicoPreparo = emPreparo.slice(0, 12);
    $('gridPreparo').innerHTML = historicoPreparo.map(o => `
        <div class="bg-yellow-900/10 border border-yellow-700/30 rounded-xl p-4 flex flex-col items-center justify-center">
            <span class="text-3xl font-black text-yellow-500">#${o.number}</span>
            <span class="text-sm text-gray-400 truncate w-full text-center mt-1">${esc(o.customer || 'Balcão')}</span>
        </div>
    `).join('');
}

function tocarAlerta() {
    const som = $('somCampainha');
    if (som) {
        som.currentTime = 0;
        som.play().catch(e => console.log('Clique na tela da TV 1 vez para liberar o som.'));
    }

    const numeroTela = $('senhaAtual');
    numeroTela.classList.add('text-orange-500', 'scale-110');
    numeroTela.classList.remove('text-green-500');

    setTimeout(() => {
        numeroTela.classList.remove('text-orange-500', 'scale-110');
        numeroTela.classList.add('text-green-500');
    }, 3000);
}

// Relógio da TV
setInterval(() => {
    const now = new Date();
    $('relogio').textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}, 1000);

window.addEventListener('dbchange', render);
render();