// /js/dashboard.js

// Get Firebase services using the v8 namespaced syntax
const auth = firebase.auth();
const db = firebase.database();

// Import panel modules
import { loadPanel as loadAdminPanel } from './panels/admin.js';
import { loadPanel as loadManagerPanel } from './panels/manager.js';
import { loadPanel as loadStaffPanel } from './panels/staff.js';
import { loadPanel as loadDeliveryPanel } from './panels/delivery.js';
import { loadPanel as loadOwnerPanel } from './panels/owner.js';
import { loadPanel as loadMenuOffersPanel } from './panels/menu-offers.js'; // Ensure this import is correct


/**
 * Dynamically loads the panel for the given role and content section.
 * @param {string} role The role of the current user.
 * @param {string} targetPanelKey The key from the data-panel attribute (e.g., 'users', 'menu-offers').
 */
async function loadRolePanel(role, targetPanelKey = 'default') { // Renamed contentSection to targetPanelKey for clarity
    const panelRoot = document.getElementById('panel-root');
    const panelTitle = document.getElementById('panel-title');
    const userInfo = document.getElementById('user-info');
    const navContainer = document.getElementById('sidebar-nav');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (!panelRoot || !panelTitle || !userInfo || !navContainer || !sidebar || !sidebarOverlay) {
        console.error('Dashboard layout elements are missing!');
        return;
    }

    // Clear previous content and show loading state
    panelRoot.innerHTML = `
        <div class="text-center py-20 bg-white rounded-xl shadow-lg">
            <i class="fas fa-spinner fa-spin text-4xl text-brand-red mb-4"></i>
            <p class="mt-4 text-lg text-gray-600">Loading ${capitalizeFirstLetter(targetPanelKey.replace('-', ' '))}...</p>
        </div>
    `;

    // Close sidebar on mobile after navigation
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    sidebarOverlay.classList.add('hidden');


    try {
        let panelModuleToLoad;
        let effectivePanelKey = targetPanelKey; // Keep track of which panel actually loaded

        if (role === 'admin') {
            // Admin role has specific sub-panels based on targetPanelKey
            if (targetPanelKey === 'users') {
                panelModuleToLoad = loadAdminPanel;
            } else if (targetPanelKey === 'menu-offers') { // This will now match the `data-panel` from admin.js
                panelModuleToLoad = loadMenuOffersPanel;
            } else if (targetPanelKey === 'system') {
                // Assuming you'll create a system.js panel later
                // panelModuleToLoad = loadSystemPanel;
                panelModuleToLoad = loadAdminPanel; // Fallback to admin panel for now
                effectivePanelKey = 'users'; // Reflect that admin panel is loaded
            } else {
                // Default for admin if no specific targetPanelKey or unknown
                panelModuleToLoad = loadAdminPanel;
                effectivePanelKey = 'users'; // Default to User Management
            }
        } else {
            // Logic for other roles remains similar, loading their respective main panels
            switch (role) {
                case 'manager':
                    panelModuleToLoad = loadManagerPanel;
                    break;
                case 'staff':
                    panelModuleToLoad = loadStaffPanel;
                    break;
                case 'delivery':
                    panelModuleToLoad = loadDeliveryPanel;
                    break;
                case 'owner':
                    panelModuleToLoad = loadOwnerPanel;
                    break;
                default:
                    throw new Error(`No panel defined for role: ${role}`);
            }
            effectivePanelKey = role; // For non-admin roles, their role IS their panel key
        }
        
        if (typeof panelModuleToLoad === 'function') {
            panelRoot.innerHTML = ''; // Clear loading message once module is ready to render
            panelModuleToLoad(panelRoot, panelTitle, navContainer); // Pass all necessary elements

            userInfo.innerHTML = `
                <i class="fas fa-user-circle text-gray-400 text-3xl"></i>
                <div>
                    <p class="font-semibold text-gray-800">${auth.currentUser.email}</p>
                    <p class="text-sm text-gray-500">${capitalizeFirstLetter(role)} View</p>
                </div>
            `;

            // Ensure the correct nav item is active based on the effectivePanelKey
            navContainer.querySelectorAll('a').forEach(link => {
                link.classList.remove('active-nav-link');
                if (link.dataset.panel === effectivePanelKey) {
                    link.classList.add('active-nav-link');
                }
            });

        } else {
            throw new Error(`The loaded module for role '${role}' (panel key '${effectivePanelKey}') does not export a 'loadPanel' function.`);
        }
    } catch (error) {
        console.error(`Failed to load panel for role '${role}' (panel key '${targetPanelKey}'):`, error);
        panelRoot.innerHTML = `
            <div class="text-center bg-red-50 p-6 rounded-xl shadow-lg mt-8">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i>
                <p class="text-red-700 font-semibold mb-2">Error loading your dashboard.</p>
                <p class="text-sm text-gray-600">Could not load the view for the '${role}' role. Please ensure the server is running and you have the correct permissions.</p>
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
        let userRole = null;

        if (userSnapshot.exists()) {
            userRole = userSnapshot.val().role;
        }

        const staffRoles = ['admin', 'manager', 'staff', 'delivery', 'owner'];

        if (staffRoles.includes(userRole)) {
            // Initial load for admin: default to 'users' panel
            if (userRole === 'admin') {
                loadRolePanel(userRole, 'users'); // Explicitly load users panel first for admin
            } else {
                loadRolePanel(userRole); // Other roles load their default panel
            }
            
        } else {
            window.location.href = '../order-type-selection.html';
        }

    } else {
        window.location.href = '../auth.html';
    }
});