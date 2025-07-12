// /js/dashboard.js

// --- Pretend to be a user ---
// Change this to 'manager', 'admin', 'delivery', etc., to see different dashboards!
const currentUserRole = 'admin';

/**
 * Finds the correct "drawing instructions" (the panel.js file) and tells it to draw.
 * @param {string} role The role of the current user.
 */
async function loadRolePanel(role) {
    const panelRoot = document.getElementById('panel-root');
    const panelTitle = document.getElementById('panel-title');
    const userInfo = document.getElementById('user-info');
    const navContainer = document.getElementById('sidebar-nav');

    if (!panelRoot || !panelTitle || !userInfo) {
        console.error('Oops! The main dashboard HTML is missing key parts.');
        return;
    }

    try {
        // This is where we pick the right drawing instructions
        const panelModule = await import(`./panels/${role}.js`);

        if (typeof panelModule.loadPanel === 'function') {
            // Erase the "Loading..." message
            panelRoot.innerHTML = '';
            // Tell the instructions to start drawing!
            panelModule.loadPanel(panelRoot, panelTitle, navContainer);
             userInfo.innerHTML = `
                <p class="font-semibold">${capitalizeFirstLetter(role)} View</p>
                <p class="text-sm text-gray-500">user.email@example.com</p>
            `;
        } else {
            throw new Error(`The instructions for the '${role}' role are incomplete.`);
        }
    } catch (error) {
        console.error(`Couldn't load the dashboard for '${role}':`, error);
        panelRoot.innerHTML = `
            <div class="text-center bg-red-50 p-6 rounded-lg">
                <p class="text-red-700 font-semibold">Error: Could not load your dashboard.</p>
            </div>
        `;
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// When the page is ready, figure out who the user is and draw their dashboard.
document.addEventListener('DOMContentLoaded', () => {
    loadRolePanel(currentUserRole);
});