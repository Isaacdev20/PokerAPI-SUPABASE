import { initDottedSurface } from './dotted-surface.js';

// Fundo sombrio para o modo admin
initDottedSurface('dotted-surface-container', {
    theme: 'dark',
    size: 4,
    opacity: 0.3
});

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const loggedUser = localStorage.getItem('username');

    // MURALHA DE SEGURANÇA: Se não for VOCÊ, manda embora!
    if (loggedUser !== 'DevBaisac_admin') {
        document.getElementById('access-denied').style.display = 'block';
        setTimeout(() => {
            window.location.href = "index.html"; // Chuta para a tela de login
        }, 1500);
        return; // Para o código por aqui
    }

    // Se passou na segurança, mostra o painel
    document.getElementById('admin-panel').style.display = 'block';

    const adminList = document.getElementById('admin-list');
    const loadingMsg = document.getElementById('loading-msg');
    const saveChipsBtn = document.getElementById('save-chips-btn');
    const adminStatus = document.getElementById('admin-status');

    let profiles = [];

    // Busca os jogadores
    try {
        const response = await fetch('https://cyberpoker.onrender.com/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.profiles) {
            profiles = data.profiles;
            renderAdminPanel();
        } else {
            loadingMsg.textContent = 'Erro ao carregar dados.';
        }
    } catch (err) {
        loadingMsg.textContent = 'Servidor fora do ar.';
    }

    function renderAdminPanel() {
        adminList.innerHTML = '';
        loadingMsg.style.display = 'none';

        profiles.forEach((profile) => {
            const li = document.createElement('li');
            li.className = 'admin-item';

            li.innerHTML = `
                <span class="admin-name">👤 ${profile.username}</span>
                <input type="number" class="chip-edit-input" data-username="${profile.username}" value="${profile.chips}">
            `;
            adminList.appendChild(li);
        });
    }

    // Botão de salvar
    saveChipsBtn.addEventListener('click', async () => {
        const inputs = document.querySelectorAll('.chip-edit-input');
        const playersToUpdate = [];

        inputs.forEach(input => {
            const username = input.getAttribute('data-username');
            const newChips = parseInt(input.value, 10);
            if (!isNaN(newChips)) {
                playersToUpdate.push({ username, chips: newChips });
            }
        });

        adminStatus.textContent = 'Processando...';
        adminStatus.style.color = 'white';

        try {
            const response = await fetch('https://cyberpoker.onrender.com/api/save_chips', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ players: playersToUpdate })
            });

            const data = await response.json();
            if (data.success) {
                adminStatus.textContent = '✅ Saldo atualizado no banco de dados!';
                adminStatus.style.color = 'lime';
                setTimeout(() => adminStatus.textContent = '', 2000);
            }
        } catch (err) {
            adminStatus.textContent = '❌ Erro ao comunicar com o servidor.';
            adminStatus.style.color = 'red';
        }
    });
});
