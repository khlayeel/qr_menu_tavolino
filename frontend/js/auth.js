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

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        Utils.showMessage('Tous les champs sont requis', 'error');
        return;
    }

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
    }
}

// Déconnexion
async function logout() {
    await Auth.logout();
    window.location.href = 'login.html';
}