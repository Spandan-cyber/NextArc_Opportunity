document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase === 'undefined') return;
    
    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();

    // Get ALL HTML elements (Desktop and Mobile)
    const signInBtns = [document.getElementById('google-signin-btn-desktop'), document.getElementById('google-signin-btn-mobile')];
    const userProfileDivs = [document.getElementById('user-profile-desktop'), document.getElementById('user-profile-mobile')];
    const userAvatars = [document.getElementById('user-avatar-desktop'), document.getElementById('user-avatar-mobile')];
    const logoutBtns = [document.getElementById('logout-btn-desktop'), document.getElementById('logout-btn-mobile')];
    const aiBotAccessBtn = document.getElementById('ai-bot-access');
    // --- Sign In ---
    signInBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                auth.signInWithPopup(provider).catch((error) => console.error('Sign-in error:', error.message));
            });
        }
    });

    // --- Sign Out ---
    logoutBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                auth.signOut().catch((error) => console.error('Sign-out error:', error));
            });
        }
    });

    // --- Auth State Observer ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in: Update all UI elements
            signInBtns.forEach(btn => { if(btn) btn.style.display = 'none'; });
            userProfileDivs.forEach(div => { if(div) div.style.display = 'flex'; });
            userAvatars.forEach(avatar => {
                if(avatar) {
                    // Use the user's provided photo or a dynamic avatar fallback
                    avatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=random`;
                }
            });
            if (aiBotAccessBtn) aiBotAccessBtn.classList.add('show-bot-access');
        } else {
            // User is signed out: Update all UI elements
            signInBtns.forEach(btn => { if(btn) btn.style.display = 'flex'; });
            userProfileDivs.forEach(div => { if(div) div.style.display = 'none'; });
            userAvatars.forEach(avatar => { if(avatar) avatar.src = ''; });
            if (aiBotAccessBtn) aiBotAccessBtn.classList.remove('show-bot-access');
        }
        
    });
});