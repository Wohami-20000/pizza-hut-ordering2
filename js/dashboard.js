// /js/dashboard.js - Refactored for better organization and scalability

// Get Firebase services
const auth = firebase.auth();
const db = firebase.database();

// --- Panel Module Imports ---
// Centralized imports for all available dashboard panels.
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
// A new main dashboard panel can be created, e.g., './panels/dashboard-main.js'
// import { loadPanel as loadMainDashboardPanel } from './panels/dashboard-main.js';

// --- Configuration ---

// Maps panel keys (from data-panel attributes) to their corresponding module loaders.
// This makes adding new panels much cleaner.
const panelMap = {
    'admin': loadAdminPanel,
    'manager': loadManagerPanel,
    'staff': loadStaffPanel,
    'delivery': loadDeliveryPanel,
    'owner': loadOwnerPanel,
    'menu-items': loadMenuItemsPanel,
    'offers': loadOffersPanel,
    'promo-codes': loadPromoCodesPanel,
    'orders': loadOrdersPanel,
    'feedback': loadFeedbackPanel,
    'team': loadTeamPanel,
    'analytics': loadAnalyticsPanel,
    'assign-deliveries': loadAssignDeliveriesPanel,
    'stock': loadStockPanel,
    'system': loadSystemPanel,
    // 'dashboard': loadMainDashboardPanel, // Example for a main dashboard view
};

// Defines the navigation links available for each role.
const navConfig = {
    admin: [
        // { key: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
        { key: 'users', label: 'User Management', icon: 'fa-users-cog' },
        { key: 'orders', label: 'Order Management', icon: 'fa-receipt' },
        { key: 'menu-items', label: 'Menu Items', icon: 'fa-pizza-slice' },
        { key: 'analytics', label: 'Analytics', icon: 'fa-chart-line' },
        { key: 'team', label: 'Team Management', icon: 'fa-sitemap' },
        { key: 'assign-deliveries', label: 'Assign Deliveries', icon: 'fa-motorcycle' },
        { key: 'stock', label: 'Stock Management', icon: 'fa-boxes' },
        { key: 'offers', label: 'Offers / Deals', icon: 'fa-star' },
        { key: 'promo-codes', label: 'Promo Codes', icon: 'fa-gift' },
        { key: 'feedback', label: 'Customer Feedback', icon: 'fa-comment-dots' },
        { key: 'system', label: 'System Config', icon: 'fa-cogs' },
    ],
    manager: [
        // { key: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
        { key: 'orders', label: 'Order Management', icon: 'fa-receipt' },
        { key: 'menu-items', label: 'Menu Management', icon: 'fa-pizza-slice' },
        { key: 'analytics', label: 'Analytics', icon: 'fa-chart-line' },
    ],
    // Define other roles similarly...
};

// --- UI & Core Logic ---

/**
 * Capitalizes the first letter of a string.
 * @param {string} string The string to capitalize.
 * @returns {string}
 */
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Builds the sidebar navigation based on the user's role.
 * @param {string} role The user's role.
 */
function buildSidebarNav(role) {
    const navContainer = document.getElementById('sidebar-nav');
    const links = navConfig[role] || [];
    
    if (links.length === 0) {
        navContainer.innerHTML = '<p class="text-gray-400 p-4">No navigation items for this role.</p>';
        return;
    }

    navContainer.innerHTML = links.map(link => `
        <a href="#" class="block py-2.5 px-4 rounded-lg transition duration-200 hover:bg-gray-700 hover:text-white" data-panel="${link.key}">
            <i class="fas ${link.icon} mr-3 w-6 text-center"></i>${link.label}
        </a>
    `).join('');
}

/**
 * Dynamically loads the content for a selected panel.
 * @param {string} panelKey The key of the panel to load (e.g., 'users', 'orders').
 */
async function loadPanel(panelKey) {
    const panelRoot = document.getElementById('panel-root');
    const panelTitle = document.getElementById('panel-title');
    
    // Set loading state
    panelRoot.innerHTML = `
        <div class="text-center py-20 bg-white rounded-xl shadow-lg">
            <i class="fas fa-spinner fa-spin text-4xl text-brand-red mb-4"></i>
            <p class="mt-4 text-lg text-gray-600">Loading ${capitalizeFirstLetter(panelKey.replace('-', ' '))}...</p>
        </div>
    `;

    // Close sidebar on mobile after clicking a link
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.add('-translate-x-full');
        document.getElementById('sidebar-overlay').classList.add('hidden');
    }

    const loadFunction = panelMap[panelKey];
    if (typeof loadFunction === 'function') {
        try {
            await loadFunction(panelRoot, panelTitle, document.getElementById('sidebar-nav'));
            // Update active link in sidebar
            document.querySelectorAll('#sidebar-nav a').forEach(link => {
                link.classList.toggle('active-nav-link', link.dataset.panel === panelKey);
                link.classList.toggle('bg-gray-700', link.dataset.panel === panelKey);
                link.classList.toggle('text-white', link.dataset.panel === panelKey);
            });
        } catch (error) {
            console.error(`Failed to load panel '${panelKey}':`, error);
            panelRoot.innerHTML = `<div class="text-center bg-red-50 p-6 rounded-xl shadow-lg"><p class="text-red-700 font-bold">Error loading panel.</p><p class="text-sm text-red-600 mt-2">${error.message}</p></div>`;
        }
    } else {
        console.error(`No panel loader found for key: ${panelKey}`);
        panelRoot.innerHTML = `<div class="text-center bg-red-50 p-6 rounded-xl shadow-lg"><p class="text-red-700">Panel not found.</p></div>`;
    }
}

/**
 * Initializes the dashboard for the authenticated user.
 * @param {firebase.User} user The authenticated user object.
 */
async function initializeDashboard(user) {
    const userRef = db.ref(`users/${user.uid}`);
    const userSnapshot = await userRef.get();
    const userRole = userSnapshot.exists() ? userSnapshot.val().role : null;
    const staffRoles = ['admin', 'manager', 'staff', 'delivery', 'owner'];

    if (!staffRoles.includes(userRole)) {
        window.location.href = '../order-type-selection.html';
        return;
    }

    // Update user info in the header
    document.getElementById('user-info').innerHTML = `
        <i class="fas fa-user-circle text-gray-400 text-3xl"></i>
        <div>
            <p class="font-semibold text-gray-800">${user.email}</p>
            <p class="text-sm text-gray-500">${capitalizeFirstLetter(userRole)} View</p>
        </div>
    `;

    // Build UI and load initial panel
    buildSidebarNav(userRole);
    const initialPanel = navConfig[userRole]?.[0]?.key || 'orders'; // Default to first nav item or 'orders'
    loadPanel(initialPanel);

    // Set up navigation event listener
    const navContainer = document.getElementById('sidebar-nav');
    if (!navContainer.dataset.listenerAttached) {
        navContainer.addEventListener('click', (event) => {
            const targetLink = event.target.closest('a');
            if (targetLink && targetLink.dataset.panel) {
                event.preventDefault();
                loadPanel(targetLink.dataset.panel);
            }
        });
        navContainer.dataset.listenerAttached = 'true';
    }
}

/**
 * Sets up sidebar toggle functionality for mobile view.
 */
function setupSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');

    const closeSidebar = () => {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    };

    openSidebarBtn.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
    });

    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
}

// --- Main Execution ---

document.addEventListener('DOMContentLoaded', () => {
    setupSidebarToggle();
    
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeDashboard(user);
        } else {
            window.location.href = '../auth.html';
        }
    });
});
