// This file will handle all Firebase Authentication logic

// Make sure firebase-init.js is loaded before this file
document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined' || !firebase.app) {
        console.error("Firebase is not initialized. Make sure firebase-init.js is loaded correctly.");
        return;
    }
    
    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();

    // Get HTML elements
    const signInButton = document.getElementById('google-signin-btn');
    const userProfileDiv = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');
    const logoutButton = document.getElementById('logout-btn');

    // --- Sign In ---
    if (signInButton) {
        signInButton.addEventListener('click', () => {
            auth.signInWithPopup(provider)
                .then((result) => {
                    // This gives you a Google Access Token. You can use it to access the Google API.
                    const credential = result.credential;
                    const token = credential.accessToken;
                    // The signed-in user info.
                    const user = result.user;
                    console.log('User signed in:', user);
                }).catch((error) => {
                    // Handle Errors here.
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    console.error('Sign-in error:', errorMessage);
                });
        });
    }

    // --- Sign Out ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                // Sign-out successful.
                console.log('User signed out.');
            }).catch((error) => {
                // An error happened.
                console.error('Sign-out error:', error);
            });
        });
    }


    // --- Auth State Observer ---
    // This function runs whenever the user's login state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            // Hide sign-in button, show user profile
            signInButton.style.display = 'none';
            userProfileDiv.style.display = 'flex';
            userAvatar.src = user.photoURL; // Get user's Google profile picture
            
        } else {
            // User is signed out
            // Show sign-in button, hide user profile
            signInButton.style.display = 'flex';
            userProfileDiv.style.display = 'none';
            userAvatar.src = '';
        }
    });
});