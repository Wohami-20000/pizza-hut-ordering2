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
        const panelModule = await import(`./panels/${role}.js`);
        
        if (typeof panelModule.loadPanel === 'function') {
            panelRoot.innerHTML = '';
            panelModule.loadPanel(panelRoot, panelTitle, navContainer);
            
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
        // --- PANDA DETECTIVE STEP 1 ---
        // Let's see which user ID the code thinks you are.
        console.log("🐼 Detective: User is logged in with UID:", user.uid);

        const userRef = db.ref(`users/${user.uid}`);
        const userSnapshot = await userRef.get();

        let userRole = 'staff'; 

        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            
            // --- PANDA DETECTIVE STEP 2 ---
            // Let's see exactly what data the code found in the database for this user.
            console.log("🐼 Detective: Found user data in the database:", userData);

            userRole = userData.role || 'staff';
        } else {
             // --- PANDA DETECTIVE STEP 3 ---
            // If we get here, the code couldn't find a profile for your UID.
            console.error("🐼 Detective: COULD NOT FIND a database entry for user:", user.uid);
        }
        
        // --- PANDA DETECTIVE STEP 4 ---
        // This will tell us the final role that was decided.
        console.log(`🐼 Detective: Decided role is "${userRole}". Loading panel...`);
        
        loadRolePanel(userRole);

    } else {
        window.location.href = 'auth.html'; 
    }
});