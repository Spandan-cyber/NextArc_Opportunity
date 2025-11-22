document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();
    const adminStatus = document.getElementById('admin-status');

    // 1. CHECK AUTH STATE AND ROLE
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            alert("Access Denied: Please log in.");
            window.location.href = 'index.html';
            return;
        }

        // Check if the user's UID matches the ADMIN_UID defined in config.js
        if (user.uid !== ADMIN_UID) {
            alert("Access Denied: You are not authorized to view this page.");
            window.location.href = 'index.html';
            return;
        }

        // --- USER IS ADMIN: PROCEED ---
        adminStatus.textContent = `Welcome, Admin: ${user.displayName || 'Owner'}`;
        setupAdminLogic(user.uid);
    });

    // 2. LOGOUT BUTTON
    document.getElementById('logout-btn-admin').addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        });
    });

    // 3. DATA FETCHING AND DISPLAY
    async function setupAdminLogic(adminId) {
        // COUNT TOTAL USERS
        const userCount = await db.collection('users').get();
        document.getElementById('total-users').querySelector('h2').textContent = userCount.size;
        
        // This is where you would fetch and display user-submitted content for approval.
        // For now, it shows the count of saved documents across all users (conceptually).
        document.getElementById('total-saved').querySelector('h2').textContent = 'N/A'; // Need aggregation query for this
    }
});