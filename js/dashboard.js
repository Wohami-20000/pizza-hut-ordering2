// /js/dashboard.js

// Get Firebase services
const auth = firebase.auth();
const db = firebase.database();

// Import panel modules
import { loadPanel as loadAdminPanel } from './panels/admin.js';
import { loadPanel as loadManagerPanel } from './panels/manager.js';
import { loadPanel as loadStaffPanel } from './panels/staff.js';
import { loadPanel as loadDeliveryPanel } from './panels/delivery.js';
import { loadPanel as loadOwnerPanel } from './panels/owner.js';
import { loadPanel as loadMenuItemsPanel } from './panels/menu-items.js';
import { loadPanel as loadOffersPanel } from './panels/offers.js';
import { loadPanel as loadPromoCodesPanel } from './panels/promo-codes.js';
import { loadPanel as loadOrdersPanel } from './panels/orders.js';
import { loadPanel as loadFeedbackPanel } from './panels/feedback.js';
import { loadPanel as loadTeamPanel } from './panels/team.js';
import { loadPanel as loadAnalyticsPanel } from './panels/analytics.js';
import { loadPanel as loadAssignDeliveriesPanel } from './panels/assign-deliveries.js';

/**
 * Dynamically loads the panel for the given role and content section.
 * @param {string} role The role of the current user.
 * @param {string} targetPanelKey The key from the data-panel attribute.
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

    panelRoot.innerHTML = `
        <div class="text-center py-20 bg-white rounded-xl shadow-lg">
            <i class="fas fa-spinner fa-spin text-4xl text-brand-red mb-4"></i>
            <p class="mt-4 text-lg text-gray-600">Loading ${capitalizeFirstLetter(targetPanelKey.replace('-', ' '))}...</p>
        </div>
    `;

    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }

    try {
        let panelModuleToLoad;
        let effectivePanelKey = targetPanelKey;

        if (role === 'admin') {
            switch (targetPanelKey) {
                case 'users':
                    panelModuleToLoad = loadAdminPanel;
                    break;
                case 'analytics':
                    panelModuleToLoad = loadAnalyticsPanel;
                    break;
                case 'team':
                    panelModuleToLoad = loadTeamPanel;
                    break;
                case 'assign-deliveries':
                    panelModuleToLoad = loadAssignDeliveriesPanel;
                    break;
                case 'orders':
                    panelModuleToLoad = loadOrdersPanel;
                    break;
                case 'feedback':
                    panelModuleToLoad = loadFeedbackPanel;
                    break;
                case 'menu-items':
                    panelModuleToLoad = loadMenuItemsPanel;
                    break;
                case 'offers':
                    panelModuleToLoad = loadOffersPanel;
                    break;
                case 'promo-codes':
                    panelModuleToLoad = loadPromoCodesPanel;
                    break;
                default:
                    panelModuleToLoad = loadAdminPanel;
                    effectivePanelKey = 'users';
                    break;
            }
        } else {
            // Logic for other roles can be added here
            // Example:
            // if (role === 'manager') {
            //     panelModuleToLoad = loadManagerPanel;
            // }
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
        panelRoot.innerHTML = `<div class="text-center bg-red-50 p-6 rounded-xl shadow-lg mt-8"><p class="text-red-700">Error loading dashboard.</p></div>`;
    }
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Main Authentication Listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userRef = db.ref(`users/${user.uid}`);
        const userSnapshot = await userRef.get();
        let userRole = userSnapshot.exists() ? userSnapshot.val().role : null;
        const staffRoles = ['admin', 'manager', 'staff', 'delivery', 'owner'];

        if (staffRoles.includes(userRole)) {
            
            // Force a refresh of the user's token to get admin claim
            try {
                await user.getIdToken(true);
                console.log("User token refreshed. Admin claim should now be active.");
            } catch (error) {
                console.error("Error refreshing user token:", error);
            }

            const initialPanel = userRole === 'admin' ? 'users' : userRole;
            loadRolePanel(userRole, initialPanel);

            const navContainer = document.getElementById('sidebar-nav');
            // Ensure we only have one listener attached
            if (!navContainer.dataset.listenerAttached) {
                navContainer.addEventListener('click', (event) => {
                    const targetLink = event.target.closest('a');
                    if (targetLink && targetLink.dataset.panel) {
                        event.preventDefault();
                        loadRolePanel(userRole, targetLink.dataset.panel);
                    }
                });
                navContainer.dataset.listenerAttached = 'true';
            }

        } else {
            window.location.href = '../order-type-selection.html';
        }
    } else {
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