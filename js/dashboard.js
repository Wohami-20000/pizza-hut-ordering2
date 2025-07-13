// /js/dashboard.js

// Get Firebase services using the v8 namespaced syntax
const auth = firebase.auth();
const db = firebase.database();

/**
 * Dynamically loads the panel for the given role.
 * @param {string} role The role of the current user.
 */
async function loadRolePanel(role) {
    const panelRoot = document.getElementById('panel-root');
    const panelTitle = document.getElementById('panel-title');
    const userInfo = document.getElementById('user-info');
    const navContainer = document.getElementById('sidebar-nav');

    if (!panelRoot || !panelTitle || !userInfo) {
        console.error('Dashboard layout elements are missing!');
        return;
    }

    try {
        // This line is the magic: it imports the correct file from the /panels/ folder.
        const panelModule = await import(`./panels/${role}.js`);
        
        if (typeof panelModule.loadPanel === 'function') {
            panelRoot.innerHTML = '';
            panelModule.loadPanel(panelRoot, panelTitle, navContainer); // Pass all necessary elements
            
            userInfo.innerHTML = `
                <p class="font-semibold">${capitalizeFirstLetter(role)} View</p>
                <p class="text-sm text-gray-500">${auth.currentUser.email}</p>
            `;
        } else {
            throw new Error(`The module for role '${role}' does not export a 'loadPanel' function.`);
        }
    } catch (error) {
        console.error(`Failed to load panel for role '${role}':`, error);
        panelRoot.innerHTML = `
            <div class="text-center bg-red-50 p-6 rounded-lg">
                <p class="text-red-700 font-semibold">Error loading your dashboard.</p>
                <p class="text-sm text-gray-600">Could not load the view for the '${role}' role.</p>
            </div>
        `;
    }
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// --- Main Authentication Listener ---
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userRef = db.ref(`users/${user.uid}`);
        const userSnapshot = await userRef.get();
        let userRole = null; // Default to null, not 'staff'

        if (userSnapshot.exists()) {
            userRole = userSnapshot.val().role;
        }

        // Define roles that should access the dashboard
        const staffRoles = ['admin', 'manager', 'staff', 'delivery', 'owner'];

        if (staffRoles.includes(userRole)) {
            loadRolePanel(userRole);
        } else {
            // If user is not an anonymous dine-in guest and not staff, redirect to order type selection
            window.location.href = '../order-type-selection.html';
        }

    } else {
        // If not logged in, go to the login page.
        window.location.href = '../auth.html'; 
    }
});