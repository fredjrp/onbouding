import { auth } from './firebase.js';

// FirebaseUI config
const uiConfig = {
    signInSuccessUrl: '/index.html',
    signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        {
            provider: firebase.auth.EmailAuthProvider.PROVIDER_ID,
            requireDisplayName: true
        }
    ],
    tosUrl: '/terms',
    privacyPolicyUrl: '/privacy',
    credentialHelper: firebaseui.auth.CredentialHelper.NONE
};

// Initialize the FirebaseUI Widget using Firebase.
let ui = null;

// Check if we're on the login page
if (window.location.pathname === '/login.html') {
    ui = new firebaseui.auth.AuthUI(auth);
    
    // The start method will wait until the DOM is loaded.
    document.addEventListener('DOMContentLoaded', () => {
        ui.start('#firebaseui-auth-container', uiConfig);
    });
}

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        console.log('User signed in:', user.email);
        
        // If we're on the login page, redirect to index
        if (window.location.pathname === '/login.html') {
            window.location.href = '/index.html';
        }
        
        // Update UI in index.html
        if (window.location.pathname === '/index.html') {
            document.getElementById('user-name').textContent = user.displayName || 'User';
            document.getElementById('user-email').textContent = user.email;
            document.getElementById('user-initial').textContent = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U';
        }
    } else {
        // User is signed out
        console.log('User signed out');
        
        // If we're not on the login page, redirect to login
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }
});

// Logout handler
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = '/login.html';
            }).catch((error) => {
                console.error('Logout error:', error);
            });
        });
    }
});