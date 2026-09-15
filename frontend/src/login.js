// Arquivo: frontend/src/login.js
import { signIn, signUp } from './services/auth.js';
import { initDottedSurface } from './dotted-surface.js';

console.log("O login.js carregou com sucesso!");

// Inicia o fundo animado
initDottedSurface('dotted-surface-container', {
    theme: 'dark',
    size: 6,
    opacity: 0.6
});


// Pegamos os elementos HTML da tela
const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('show-password');
const statusMsg = document.getElementById('status-message');
const loginForm = document.getElementById('login-form');
const createAccountBtn = document.getElementById('create-account');

// Botão de mostrar/ocultar senha
toggleBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? 'Ocultar' : 'Mostrar';
});

// Ação de Entrar (Sign In)
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Evita que a página recarregue

    const username = document.getElementById('username').value;
    const password = passwordInput.value;

    statusMsg.textContent = "Conectando ao servidor...";
    statusMsg.style.color = "white";

    try {
        // Chama a nossa função do auth.js!
        const data = await signIn(username, password);

        statusMsg.textContent = "Sucesso! Você recebeu o JWT. Redirecionando...";
        statusMsg.style.color = "lime";

        console.log("Token JWT da Sessão recebido:", data.session.access_token);

        // Salva as credenciais e redireciona
        localStorage.setItem('access_token', data.session.access_token);
        localStorage.setItem('username', username);
        window.location.href = "jogo.html";


    } catch (error) {
        statusMsg.textContent = "Erro ao entrar: " + error.message;
        statusMsg.style.color = "red";
        console.error(error);
    }
});

// Ação de Criar Conta (Sign Up)
createAccountBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = passwordInput.value;

    if (!username || !password) {
        statusMsg.textContent = "Preencha o usuário e senha para criar a conta!";
        statusMsg.style.color = "orange";
        return;
    }

    statusMsg.textContent = "Criando sua conta...";
    statusMsg.style.color = "white";

    try {
        // Chama a nossa função do auth.js!
        await signUp(username, password);

        statusMsg.textContent = "Conta criada com sucesso! Agora clique em Entrar.";
        statusMsg.style.color = "lime";
        // Auto-login após criar conta
        const data = await signIn(username, password);
        localStorage.setItem('access_token', data.session.access_token);
        localStorage.setItem('username', username);
        window.location.href = "jogo.html";

    } catch (error) {
        statusMsg.textContent = "Erro ao criar conta: " + error.message;
        statusMsg.style.color = "red";
        console.error(error);
    }
});
