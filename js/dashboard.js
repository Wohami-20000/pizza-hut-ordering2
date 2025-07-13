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
import { loadPanel as loadMenuOffersPanel } from './panels/menu-offers.js';

/**
 * Dynamically loads the panel for the given role and content section.
 * @param {string} role The role of the current user.
 * @param {string} targetPanelKey The key from the data-panel attribute (e.g., 'users', 'menu-offers').
 */
async function loadRolePanel(role, targetPanelKey = 'default') {
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
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }


    try {
        let panelModuleToLoad;
        let effectivePanelKey = targetPanelKey;

        if (role === 'admin') {
            if (targetPanelKey === 'users') {
                panelModuleToLoad = loadAdminPanel;
            } else if (targetPanelKey === 'menu-offers') {
                panelModuleToLoad = loadMenuOffersPanel;
            } else {
                panelModuleToLoad = loadAdminPanel; // Default to User Management for admin
                effectivePanelKey = 'users';
            }
        } else {
             // Logic for other roles
            switch (role) {
                case 'manager': panelModuleToLoad = loadManagerPanel; break;
                case 'staff': panelModuleToLoad = loadStaffPanel; break;
                case 'delivery': panelModuleToLoad = loadDeliveryPanel; break;
                case 'owner': panelModuleToLoad = loadOwnerPanel; break;
                default: throw new Error(`No panel defined for role: ${role}`);
            }
            effectivePanelKey = role;
        }

        if (typeof panelModuleToLoad === 'function') {
            panelRoot.innerHTML = '';
            panelModuleToLoad(panelRoot, panelTitle, navContainer);

            userInfo.innerHTML = `
                <i class="fas fa-user-circle text-gray-400 text-3xl"></i>
                <div>
                    <p class="font-semibold text-gray-800">${auth.currentUser.email}</p>
                    <p class="text-sm text-gray-500">${capitalizeFirstLetter(role)} View</p>
                </div>
            `;

            navContainer.querySelectorAll('a').forEach(link => {
                link.classList.remove('active-nav-link', 'bg-gray-700', 'text-white');
                if (link.dataset.panel === effectivePanelKey) {
                    link.classList.add('active-nav-link', 'bg-gray-700', 'text-white');
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
        let userRole = userSnapshot.exists() ? userSnapshot.val().role : null;
        const staffRoles = ['admin', 'manager', 'staff', 'delivery', 'owner'];

        if (staffRoles.includes(userRole)) {
            // Initial load
            const initialPanel = userRole === 'admin' ? 'users' : userRole;
            loadRolePanel(userRole, initialPanel);

            // *** ADDED THIS NAVIGATION LOGIC ***
            const navContainer = document.getElementById('sidebar-nav');
            navContainer.addEventListener('click', (event) => {
                const targetLink = event.target.closest('a');
                if (targetLink && targetLink.dataset.panel) {
                    event.preventDefault();
                    loadRolePanel(userRole, targetLink.dataset.panel);
                }
            });

        } else {
            // If not a staff member, redirect them away from the dashboard
            window.location.href = '../order-type-selection.html';
        }
    } else {
        // Not logged in, redirect to auth page
        window.location.href = '../auth.html';
    }
});

// Sidebar toggle for mobile
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');

    openSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
    });

    const closeSidebar = () => {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    };

    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
});