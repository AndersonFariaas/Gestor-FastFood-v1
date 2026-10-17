// Só aceita redirecionar para páginas do próprio sistema (evita open redirect).
const requestedPage = new URLSearchParams(window.location.search).get('redirect') || '';
const redirectPage = /^[a-z]+\.html$/.test(requestedPage) && requestedPage !== 'login.html' ? requestedPage : 'index.html';

const authForm = document.getElementById('authForm');
const btnSubmit = document.getElementById('btnSubmit');

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    if (!username || !password) return;

    const originalText = btnSubmit.innerText;
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Aguarde...';
    btnSubmit.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.ok) {
            window.location.href = redirectPage;
            return;
        }
        toast(data.message);
    } catch (err) {
        toast('Erro: Sem conexão com o servidor.');
    }

    btnSubmit.disabled = false;
    btnSubmit.innerText = originalText;
    btnSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
});
