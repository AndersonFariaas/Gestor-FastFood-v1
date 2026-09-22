const urlParams = new URLSearchParams(window.location.search);
const redirectPage = urlParams.get('redirect') || 'index.html';

let isLoginMode = true;

const authForm = document.getElementById('authForm');
const toggleMode = document.getElementById('toggleMode');
const roleSelection = document.getElementById('roleSelection');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');
const btnSubmit = document.getElementById('btnSubmit');

const localSocket = typeof io !== 'undefined' ? io() : null;

toggleMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;

    if (isLoginMode) {
        formTitle.innerText = 'Acesso Restrito';
        formSubtitle.innerText = 'Faça login para continuar';
        btnSubmit.innerText = 'Entrar no Sistema';
        toggleMode.innerText = 'Criar novo usuário';
        roleSelection.classList.add('hidden');
    } else {
        formTitle.innerText = 'Novo Usuário';
        formSubtitle.innerText = 'Cadastre um novo operador';
        btnSubmit.innerText = 'Cadastrar';
        toggleMode.innerText = 'Voltar para o Login';
        roleSelection.classList.remove('hidden');
    }
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!localSocket) {
        toast("Erro: Sem conexão com o servidor.");
        return;
    }

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const roleEl = document.getElementById('role');
    const role = roleEl ? roleEl.value : 'user';

    if (!username || !password) return;

    if (isLoginMode) {
        localSocket.emit('login', { username, password }, (response) => {
            if (response.success) {
                localStorage.setItem('lanchonete_session', JSON.stringify(response.user));
                window.location.href = redirectPage;
            } else {
                toast(response.message);
            }
        });
    } else {
        localSocket.emit('register', { username, password, role }, (response) => {
            if (response.success) {
                toast(response.message);
                toggleMode.click();
                document.getElementById('password').value = '';
            } else {
                toast(response.message);
            }
        });
    }
});