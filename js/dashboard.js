// /js/dashboard.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js";
// **FIX:** Removed 'get' from this import because it's not needed here in v8
import { getDatabase, ref } from "https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js";

const auth = getAuth();
const db = getDatabase();

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        
        // **FIX:** Changed `get(userRef)` to `userRef.get()` which is the correct syntax for Firebase v8
        const userSnapshot = await userRef.get();

        let userRole = 'staff'; 

        if (userSnapshot.exists()) {
            userRole = userSnapshot.val().role || 'staff';
        } else {
            console.warn(`No database entry found for user ${user.uid}. Defaulting to 'staff' role.`);
        }
        
        loadRolePanel(userRole);

    } else {
        window.location.href = 'auth.html'; 
    }
});