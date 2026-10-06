/* ============================================
   SUPABASE CLIENT - Configuration
   A inclure AVANT auth.js / menu.js / dashboard.js
   ============================================ */

const SUPABASE_URL = "https://xlkwiugdjgsfxcpesvye.supabase.co";
const SUPABASE_KEY = "sb_publishable_IlFuakEFZNvoOpo-aP1_5A_xOD98i6L";

// IMPORTANT : on l'appelle "supabaseClient" (et non "supabase") car la librairie
// chargée depuis le CDN déclare déjà une variable globale nommée "supabase".
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Nom du bucket Storage créé dans Supabase pour les photos
const STORAGE_BUCKET = "product-images";

/* Helpers d'authentification partagés entre auth.js et dashboard.js */
const Auth = {
    async isLoggedIn() {
        const { data } = await supabaseClient.auth.getSession();
        return !!data.session;
    },
    async getUser() {
        const { data } = await supabaseClient.auth.getUser();
        return data.user;
    },
    async logout() {
        await supabaseClient.auth.signOut();
    },
};

/* Upload d'un fichier (logo ou photo produit) vers Supabase Storage.
   Retourne l'URL publique à stocker directement dans la base. */
async function uploadToStorage(file, folder = "") {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
    });

    if (error) throw error;

    const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
}