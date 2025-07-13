// /js/dashboard.js

// Get Firebase services using the v8 namespaced syntax
const auth = firebase.auth();
const db = firebase.database();

// Import panel modules
import { loadPanel as loadAdminPanel } from './panels/admin.js'; //
import { loadPanel as loadManagerPanel } from './panels/manager.js'; //
import { loadPanel as loadStaffPanel } from './panels/staff.js'; //
import { loadPanel as loadDeliveryPanel } from './panels/delivery.js'; //
import { loadPanel as loadOwnerPanel } from './panels/owner.js'; //
import { loadPanel as loadMenuOffersPanel } from './panels/menu-offers.js'; // New import


/**
 * Dynamically loads the panel for the given role and content section.
 * @param {string} role The role of the current user.
 * @param {string} contentSection The ID of the content section to load (e.g., 'users', 'menu-items').
 */
async function loadRolePanel(role, contentSection = 'default') {
    const panelRoot = document.getElementById('panel-root'); //
    const panelTitle = document.getElementById('panel-title'); //
    const userInfo = document.getElementById('user-info'); //
    const navContainer = document.getElementById('sidebar-nav'); //
    const sidebar = document.getElementById('sidebar'); // Added for mobile sidebar control
    const sidebarOverlay = document.getElementById('sidebar-overlay'); // Added for mobile sidebar control

    if (!panelRoot || !panelTitle || !userInfo || !navContainer || !sidebar || !sidebarOverlay) {
        console.error('Dashboard layout elements are missing!');
        return;
    }

    // Clear previous content
    panelRoot.innerHTML = `
        <div class="text-center py-20 bg-white rounded-xl shadow-lg">
            <i class="fas fa-spinner fa-spin text-4xl text-brand-red mb-4"></i>
            <p class="mt-4 text-lg text-gray-600">Loading ${capitalizeFirstLetter(contentSection.replace('-', ' '))}...</p>
        </div>
    `;

    // Close sidebar on mobile after navigation
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    sidebarOverlay.classList.add('hidden');


    try {
        let panelModule;
        // Determine which panel module to load based on role and contentSection
        if (role === 'admin' && contentSection === 'menu-offers') {
            panelModule = loadMenuOffersPanel;
            panelTitle.textContent = 'Menu & Offers Management'; // Pre-set title
            // Also ensure the correct nav item is active
            document.querySelectorAll('#sidebar-nav a').forEach(link => link.classList.remove('active-nav-link'));
            document.querySelector('#sidebar-nav a[data-content="menu-items"]')?.classList.add('active-nav-link');
        } else {
            switch (role) {
                case 'admin':
                    panelModule = loadAdminPanel; //
                    break;
                case 'manager':
                    panelModule = loadManagerPanel; //
                    break;
                case 'staff':
                    panelModule = loadStaffPanel; //
                    break;
                case 'delivery':
                    panelModule = loadDeliveryPanel; //
                    break;
                case 'owner':
                    panelModule = loadOwnerPanel; //
                    break;
                default:
                    throw new Error(`No panel defined for role: ${role}`);
            }
        }
        
        if (typeof panelModule === 'function') { // Check if it's the actual function, not the module object
            panelRoot.innerHTML = ''; // Clear loading message once module is ready to render
            panelModule(panelRoot, panelTitle, navContainer); // Pass all necessary elements

            userInfo.innerHTML = `
                <i class="fas fa-user-circle text-gray-400 text-3xl"></i>
                <div>
                    <p class="font-semibold text-gray-800">${auth.currentUser.email}</p>
                    <p class="text-sm text-gray-500">${capitalizeFirstLetter(role)} View</p>
                </div>
            `;

            // Add event listeners to sidebar navigation links
            navContainer.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Remove active class from all nav links
                    navContainer.querySelectorAll('a').forEach(navLink => navLink.classList.remove('active-nav-link'));
                    // Add active class to the clicked link
                    e.currentTarget.classList.add('active-nav-link');

                    const targetPanel = e.currentTarget.dataset.panel;
                    const targetContent = e.currentTarget.dataset.content; // New: to specify sub-sections like menu-items or offers

                    if (targetPanel) {
                        loadRolePanel(role, targetPanel); // Load main panel
                    } else if (targetContent) {
                        // If a content-specific link is clicked within a panel, directly load that content
                        // This assumes the panel is already loaded, and we're just switching sub-views
                        // For now, load the menu-offers panel and tell it which section to show
                        if (role === 'admin') { // Only admin can access these sub-sections directly via top nav
                             loadMenuOffersPanel(panelRoot, panelTitle, navContainer);
                             // Now ensure the correct sub-section is displayed
                             document.querySelectorAll('#panel-root > div').forEach(section => {
                                section.classList.add('hidden');
                            });
                            document.getElementById(`${targetContent}-section`).classList.remove('hidden');
                        }
                    }
                });
            });

        } else {
            throw new Error(`The module for role '${role}' does not export a 'loadPanel' function.`);
        }
    } catch (error) {
        console.error(`Failed to load panel for role '${role}':`, error);
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
            // Load the default panel based on role
            // For admin, default to user management or menu management
            if (userRole === 'admin') {
                loadRolePanel(userRole, 'users'); // Default to users for admin
            } else {
                loadRolePanel(userRole);
            }
            
        } else {
            window.location.href = '../order-type-selection.html';
        }

    } else {
        window.location.href = '../auth.html';
    }
});