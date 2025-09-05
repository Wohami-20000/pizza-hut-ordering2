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
import { loadPanel as loadStockPanel } from './panels/stock.js';
import { loadPanel as loadSystemPanel } from './panels/system.js';

/**
 * Builds the sidebar navigation based on the user's role.
 */
function buildSidebarNav(role) {
    const navContainer = document.getElementById('sidebar-nav');
    if (!navContainer) return;

    let navLinks = '';
    // For simplicity, we'll assume admin gets all links for now.
    // This can be broken down by role.
    if (role === 'admin' || role === 'owner' || role === 'manager') {
        navLinks = `
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="stock"><i class="fas fa-boxes mr-3"></i>Stock & Sales</a>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="orders"><i class="fas fa-receipt mr-3"></i>Live Orders</a>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="analytics"><i class="fas fa-chart-line mr-3"></i>Analytics</a>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="menu-items"><i class="fas fa-pizza-slice mr-3"></i>Menu Items</a>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="offers"><i class="fas fa-tags mr-3"></i>Offers</a>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="promo-codes"><i class="fas fa-percent mr-3"></i>Promo Codes</a>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="assign-deliveries"><i class="fas fa-motorcycle mr-3"></i>Assign Deliveries</a>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="team"><i class="fas fa-users mr-3"></i>Team Roster</a>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="feedback"><i class="fas fa-comment-dots mr-3"></i>Feedback</a>
            ${(role === 'admin' || role === 'owner') ? `
            <div class="border-t border-gray-700 my-2"></div>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="users"><i class="fas fa-users-cog mr-3"></i>User Management</a>
            <a href="#" class="block py-2.5 px-4 rounded-lg transition hover:bg-gray-700" data-panel="system"><i class="fas fa-cogs mr-3"></i>System Config</a>` : ''}
        `;
    }
    // Add other roles here...
    navContainer.innerHTML = navLinks;
}

function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Checks if the previous day's report was locked and shows an alert if not.
 */
async function checkUnclosedDays() {
    const alertBanner = document.getElementById('unclosed-day-alert');
    if (!alertBanner) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    try {
        const lockRef = db.ref(`reports/daily/${yesterdayString}/locked`);
        const snapshot = await lockRef.once('value');
        if (snapshot.val() !== true) {
            alertBanner.classList.remove('hidden');
        } else {
            alertBanner.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error checking for unclosed days:", error);
    }
}


/**
 * Dynamically loads the panel for the given role and content section.
 */
async function loadRolePanel(role, targetPanelKey = 'default') {
    const panelRoot = document.getElementById('panel-root');
    const panelTitle = document.getElementById('panel-title');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const navContainer = document.getElementById('sidebar-nav');

    if (!panelRoot || !panelTitle || !navContainer) return;

    panelRoot.innerHTML = `<div class="text-center py-20"><i class="fas fa-spinner fa-spin text-4xl text-brand-red"></i></div>`;

    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    }

    let panelModuleToLoad;
    let effectivePanelKey = targetPanelKey;

    switch (targetPanelKey) {
        case 'users': panelModuleToLoad = loadAdminPanel; break;
        case 'analytics': panelModuleToLoad = loadAnalyticsPanel; break;
        case 'team': panelModuleToLoad = loadTeamPanel; break;
        case 'assign-deliveries': panelModuleToLoad = loadAssignDeliveriesPanel; break;
        case 'stock': panelModuleToLoad = loadStockPanel; break;
        case 'orders': panelModuleToLoad = loadOrdersPanel; break;
        case 'feedback': panelModuleToLoad = loadFeedbackPanel; break;
        case 'menu-items': panelModuleToLoad = loadMenuItemsPanel; break;
        case 'offers': panelModuleToLoad = loadOffersPanel; break;
        case 'promo-codes': panelModuleToLoad = loadPromoCodesPanel; break;
        case 'system': panelModuleToLoad = loadSystemPanel; break;
        default:
            effectivePanelKey = role === 'admin' ? 'stock' : 'defaultPanel';
            panelModuleToLoad = loadStockPanel;
            break;
    }

    if (typeof panelModuleToLoad === 'function') {
        await panelModuleToLoad(panelRoot, panelTitle, db, auth);
        
        navContainer.querySelectorAll('a').forEach(link => {
            link.classList.remove('bg-gray-700', 'text-white');
            if (link.dataset.panel === effectivePanelKey) {
                link.classList.add('bg-gray-700', 'text-white');
            }
        });
    } else {
        panelRoot.innerHTML = `<p class="text-red-500">Error: Could not load panel '${targetPanelKey}'.</p>`;
    }
}

// Main Authentication Listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userSnapshot = await db.ref(`users/${user.uid}`).get();
        const userRole = userSnapshot.exists() ? userSnapshot.val().role : null;
        const staffRoles = ['admin', 'manager', 'staff', 'delivery', 'owner'];

        if (staffRoles.includes(userRole)) {
            await user.getIdToken(true);

            buildSidebarNav(userRole);
            checkUnclosedDays();
            
            const initialPanel = 'stock';
            loadRolePanel(userRole, initialPanel);

            document.getElementById('user-info').innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800">${user.email}</p>
                    <p class="text-sm text-gray-500">${capitalizeFirstLetter(userRole)} View</p>
                </div>
            `;

            const navContainer = document.getElementById('sidebar-nav');
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

    if(openSidebarBtn) openSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
    });

    const closeSidebar = () => {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    };

    if(closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if(sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
});
