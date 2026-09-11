// Arquivo: frontend/src/services/auth.js
import { supabase } from '../config/supabase.js';

/**
 * Função ajudante secreta: Transforma o username em um e-mail falso
 * para enganar a exigência do Supabase.
 */
function gerarEmailFalso(username) {
    // Remove espaços e deixa minúsculo
    const limpo = username.trim().toLowerCase().replace(/\s+/g, '');
    return `${limpo}@poker.com`;
}

/**
 * Cadastra um novo usuário com NOME DE USUÁRIO e senha.
 */
export async function signUp(username, password) {
    const fakeEmail = gerarEmailFalso(username);

    const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password: password,
        options: {
            // Opcional: Salva o username verdadeiro nos metadados
            data: {
                username: username
            }
        }
    });

    if (error) throw error;

    return data;
}

/**
 * Entra em uma conta existente usando o NOME DE USUÁRIO.
 */
export async function signIn(username, password) {
    const fakeEmail = gerarEmailFalso(username);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password: password,
    });

    if (error) throw error;

    return data;
}
