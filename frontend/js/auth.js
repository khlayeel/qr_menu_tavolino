/* ============================================
   AUTHENTICATION JAVASCRIPT - QR MENU (version Supabase)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Si l'utilisateur est déjà connecté, rediriger vers dashboard
    if (await Auth.isLoggedIn()) {
        window.location.href = 'dashboard.html';
    }
});

// Gérer la connexion
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const button = document.getElementById('login-btn');
    const label = button?.querySelector('.btn-label');

    function setLoading(loading) {
        if (!button) return;
        button.disabled = loading;
        button.classList.toggle('is-loading', loading);
        if (label) label.textContent = loading ? 'Connexion…' : 'Se connecter';
    }

    if (!email || !password) {
        Utils.showMessage('Tous les champs sont requis', 'error');
        return;
    }

    setLoading(true);
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) throw error;

        Utils.showMessage('Connexion réussie!', 'success', 1500);

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } catch (error) {
        console.error('[Auth] Login error:', error);
        Utils.showMessage('Email ou mot de passe incorrect', 'error');
        setLoading(false);
        document.getElementById('password')?.focus();
    }
}

// Déconnexion
async function logout() {
    await Auth.logout();
    window.location.href = 'login.html';
}