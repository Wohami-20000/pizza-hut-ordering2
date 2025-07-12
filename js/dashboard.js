// /js/dashboard.js

// **FIX:** Get Firebase services using the v8 namespaced syntax
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
        // Dynamically import the correct panel based on the user's role
        const panelModule = await import(`./panels/${role}.js`);
        
        if (typeof panelModule.loadPanel === 'function') {
            panelRoot.innerHTML = '';
            panelModule.loadPanel(panelRoot, panelTitle, navContainer);
            
            // Display the current user's info in the header
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
                <p class="text-red-700 font-semibold">Error: Could not load your dashboard panel.</p>
                <p class="text-sm text-gray-600">The view for the '${role}' role could not be found or loaded.</p>
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
        // A user is signed in. Let's find their role in the database.
        const userRef = db.ref(`users/${user.uid}`);
        
        // Use the correct v8 syntax to get the data
        const userSnapshot = await userRef.get();

        let userRole = 'staff'; // Default to the least powerful role

        if (userSnapshot.exists()) {
            // Get the role from the 'role' field in their database entry
            userRole = userSnapshot.val().role || 'staff';
        } else {
            console.warn(`No database entry found for user ${user.uid}. Defaulting to 'staff' role.`);
        }
        
        // Now, load the correct panel for that user's role
        loadRolePanel(userRole);

    } else {
        // No user is signed in. Redirect them to the login page.
        window.location.href = 'auth.html'; 
    }
});