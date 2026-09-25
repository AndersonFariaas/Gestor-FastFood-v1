const urlParams = new URLSearchParams(window.location.search);
const redirectPage = urlParams.get('redirect') || 'index.html';

const authForm = document.getElementById('authForm');
const btnSubmit = document.getElementById('btnSubmit');
const localSocket = typeof io !== 'undefined' ? io() : null;

authForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!localSocket) {
        toast("Erro: Sem conexão com o servidor.");
        return;
    }

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) return;

    const originalText = btnSubmit.innerText;
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Aguarde...';
    btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');

    localSocket.emit('login', { username, password }, (response) => {
        btnSubmit.disabled = false;
        btnSubmit.innerText = originalText;
        btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');

        if (response.success) {
            localStorage.setItem('lanchonete_session', JSON.stringify(response.user));
            window.location.href = redirectPage;
        } else {
            toast(response.message);
        }
    });
});