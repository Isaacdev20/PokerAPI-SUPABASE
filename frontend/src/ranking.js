import { initDottedSurface } from './dotted-surface.js';

// Inicia o fundo animado
initDottedSurface('dotted-surface-container', {
    theme: 'dark',
    size: 6,
    opacity: 0.6
});

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const loggedUser = localStorage.getItem('username') || 'Jogador';
    const rankingList = document.getElementById('ranking-list');
    const loadingMsg = document.getElementById('loading-msg');

    try {
        const response = await fetch('https://cyberpoker.onrender.com/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.profiles) {
            // Ordena os jogadores por fichas do maior pro menor
            const profiles = data.profiles.sort((a, b) => b.chips - a.chips);

            rankingList.innerHTML = '';
            loadingMsg.style.display = 'none';

            profiles.forEach((profile, index) => {
                const li = document.createElement('li');
                li.className = 'ranking-item';

                // Marca (Você) caso o jogador na lista seja o jogador logado
                const isMe = profile.username === loggedUser ? ' (Você)' : '';

                li.innerHTML = `
                    <span class="ranking-pos">${index + 1}º</span>
                    <span class="ranking-name">${profile.username}${isMe}</span>
                    <span class="ranking-chips">$${profile.chips.toLocaleString('pt-BR')}</span>
                `;
                rankingList.appendChild(li);
            });
        } else {
            loadingMsg.textContent = 'Erro ao carregar o ranking.';
            loadingMsg.style.color = 'red';
        }
    } catch (err) {
        console.error('Erro na requisição para /api/me', err);
        loadingMsg.textContent = 'Erro de conexão com o servidor.';
        loadingMsg.style.color = 'red';
    }
});
