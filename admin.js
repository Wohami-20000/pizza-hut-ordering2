// admin.js

// Initialize Firebase database and auth objects
// These are declared here, but actual assignment happens in DOMContentLoaded to ensure Firebase is fully loaded.
let auth;
let db;
let ordersRef;
let menuRef; // Reference to the 'menu' node
let offersRef; // NEW: Reference for offers

let currentLang = localStorage.getItem('lang') || 'en';

// --- Utility Functions ---
// Function to show messages/errors on the admin page
function showMessage(containerId, message, isError = false) {
    const container = document.getElementById(containerId);
    if (container) {
        // Find the span inside the container to put the message text
        const messageTextSpan = container.querySelector('#admin-page-error-text');
        if (messageTextSpan) {
            messageTextSpan.textContent = message;
        } else {
            container.textContent = message; // Fallback if span not found
        }
        
        container.classList.remove('hidden'); // Show the container
        if (isError) {
            container.classList.remove('bg-green-100', 'text-green-700', 'border-green-400');
            container.classList.add('bg-red-100', 'text-red-700', 'border-red-400');
        } else {
            container.classList.remove('bg-red-100', 'text-red-700', 'border-red-700'); // Ensure it's not red by default
            container.classList.add('bg-green-100', 'text-green-700', 'border-green-400');
        }
    }
}

// Function to hide messages/errors on the admin page
function hideMessage(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.add('hidden');
        const messageTextSpan = container.querySelector('#admin-page-error-text');
        if (messageTextSpan) {
            messageTextSpan.textContent = '';
        } else {
            container.textContent = '';
        }
    }
}

// Function to safely escape HTML to prevent XSS
function escapeHTML(str) {
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : '';
  return String(str).replace(/[<>&"']/g, s => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[s]));
}


// ---------------------- ORDER MANAGEMENT ----------------------

function loadOrders() {
    ordersRef.off(); // Detach previous listener if any, to prevent duplicates
    ordersRef.on('value', snapshot => { // Use on('value') for real-time updates
        const ordersTable = document.getElementById('ordersTableBody');
        if (!ordersTable) {
            console.error("Dashboard: ordersTableBody not found.");
            return;
        }
        ordersTable.innerHTML = ''; // Clear existing rows
        hideMessage('error-message-admin-page'); // Hide any previous error messages related to orders

        if (!snapshot.exists()) {
            console.log("Dashboard: No orders found in Firebase.");
            ordersTable.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-gray-500" data-translate="no_orders_found">No orders found.</td></tr>`;
            if (typeof applyLanguage === 'function') applyLanguage(currentLang, ordersTable);
            document.getElementById('total-orders-count').textContent = '0';
            document.getElementById('pending-orders-count').textContent = '0';
            document.getElementById('delivered-orders-count').textContent = '0';
            return;
        }

        let totalOrders = 0;
        let pendingOrders = 0;
        let deliveredOrders = 0;

        snapshot.forEach(childSnapshot => {
            totalOrders++;
            const order = childSnapshot.val();
            const key = childSnapshot.key;

            // Update counts based on current status
            if (order.status === 'pending') {
                pendingOrders++;
            } else if (order.status === 'delivered') {
                deliveredOrders++;
            }

            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';

            let customerInfo = '';
            if (order.orderType === 'dineIn' && order.table) {
                customerInfo = `Table ${escapeHTML(order.table)}`;
            } else if (order.customerName || order.customerPhone) {
                customerInfo = `${escapeHTML(order.customerName || 'N/A')} (${escapeHTML(order.customerPhone || 'N/A')})`;
            } else {
                customerInfo = 'N/A';
            }

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHTML(key)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${customerInfo}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(typeof translations !== 'undefined' && translations[currentLang]?.[`order_type_${order.orderType}`]) || order.orderType || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.items ? order.items.map(item => `${escapeHTML(item.name)} (${item.quantity})`).join(', ') : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select onchange="updateOrderStatus('${escapeHTML(key)}', this.value)" class="p-1 border rounded text-xs">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>${(typeof translations !== 'undefined' && translations[currentLang]?.status_pending) || 'Pending'}</option>
                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>${(typeof translations !== 'undefined' && translations[currentLang]?.status_preparing) || 'Preparing'}</option>
                        <option value="out for delivery" ${order.status === 'out for delivery' ? 'selected' : ''}>${(typeof translations !== 'undefined' && translations[currentLang]?.status_out_for_delivery) || 'Out for Delivery'}</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>${(typeof translations !== 'undefined' && translations[currentLang]?.status_delivered) || 'Delivered'}</option>
                    </select>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.timestamp ? new Date(order.timestamp).toLocaleString() : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.total ? order.total.toFixed(2) : '0.00'} MAD</td>
            `;
            ordersTable.appendChild(row);
        });

        document.getElementById('total-orders-count').textContent = totalOrders;
        document.getElementById('pending-orders-count').textContent = pendingOrders;
        document.getElementById('delivered-orders-count').textContent = deliveredOrders;

        // Apply language after populating the table to ensure dropdown options are translated
        if (typeof applyLanguage === 'function') applyLanguage(currentLang, ordersTable);


    }, (error) => {
        console.error("Dashboard: Orders 'value' listener error:", error);
        showMessage("error-message-admin-page", `Error loading orders: ${error.message}`, true);
        document.getElementById('ordersTableBody').innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500" data-translate="error_loading_orders">Error loading orders: ${error.message}</td></tr>`;
        if (typeof applyLanguage === 'function') applyLanguage(currentLang, ordersTable);
    });
}

// Function to update order status in Firebase
function updateOrderStatus(orderId, newStatus) {
    ordersRef.child(orderId).update({ status: newStatus })
        .then(() => {
            console.log(`Order ${orderId} status updated to ${newStatus}`);
            // No need to re-load orders explicitly here because the on('value') listener will handle it.
        })
        .catch(error => {
            console.error(`Error updating order ${orderId} status:`, error);
            showMessage("admin-page-error-text", `Failed to update order status: ${error.message}`, true);
        });
}

// ---------------------- SIDEBAR AND NAVIGATION ----------------------
function showSection(sectionId, title) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
    document.getElementById('main-title').textContent = title;

    localStorage.setItem('adminActiveSection', sectionId);
    localStorage.setItem('adminActiveTitle', title);

    // CRITICAL: If menu management section is shown, initialize adminMenu view
    if (sectionId === 'menu-management-section') {
        if (window.adminMenu && typeof window.adminMenu.initializeView === 'function') {
            window.adminMenu.initializeView();
        } else {
            console.error("admin.js: window.adminMenu.initializeView is not available.");
            showMessage("error-message-admin-page", "Menu management features are not loaded. Please check admin-menu.js.", true);
        }
    }
    // NEW: Initialize offers management view
    if (sectionId === 'offers-management-section') {
        if (window.adminOffers && typeof window.adminOffers.initializeView === 'function') {
            window.adminOffers.initializeView();
        } else {
             console.error("admin.js: window.adminOffers.initializeView is not available.");
             showMessage("error-message-admin-page", "Offers management features are not loaded.", true);
        }
    }
}

function setActiveLink(linkElement) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active-nav-link');
    });
    linkElement.classList.add('active-nav-link');
}


// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Assign Firebase objects after DOM is loaded and ensure firebase.js has run
    auth = firebase.auth();
    db = firebase.database();
    ordersRef = db.ref('orders');
    menuRef = db.ref('menu');
    offersRef = db.ref('offers'); // NEW

    console.log("admin.html: DOMContentLoaded event fired."); //

    // Language switcher setup
    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        currentLang = localStorage.getItem("lang") || "en";
        languageSwitcher.value = currentLang;
        languageSwitcher.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('lang', currentLang);
            if (typeof applyLanguage === 'function') {
                applyLanguage(currentLang);
                loadOrders(); // Re-load orders to apply language to status dropdowns
            }
        });
    }

    // Sidebar toggle buttons
    const sidebarToggleOpen = document.getElementById('sidebar-toggle-open');
    const sidebarToggleClose = document.getElementById('sidebar-toggle-close');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggleOpen) {
        sidebarToggleOpen.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.remove('-translate-x-full');
            sidebar.classList.add('translate-x-0');
        });
    }
    if (sidebarToggleClose) {
        sidebarToggleClose.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('-translate-x-full');
        });
    }
    document.addEventListener('click', (e) => {
        const isMobile = window.innerWidth < 768;
        if (isMobile && sidebar && !sidebar.contains(e.target) && sidebarToggleOpen && !sidebarToggleOpen.contains(e.target) && sidebar.classList.contains('translate-x-0')) {
            sidebar.classList.remove('translate-x-0');
            sidebar.classList.add('-translate-x-full');
        }
    });

    // Navigation links (Use event delegation for robustness)
    document.querySelectorAll('aside .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            const title = this.getAttribute('data-title');
            showSection(sectionId, title); 
            setActiveLink(this);
            if (window.innerWidth < 768) {
                sidebar.classList.remove('translate-x-0');
                sidebar.classList.add('-translate-x-full');
            }
        });
    });

    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                localStorage.clear();
                window.location.href = 'admin-login.html';
            } catch (error) {
                console.error("Logout error:", error);
                alert("Error logging out. Please try again.");
            }
        });
    }

    // Handle user authentication state and claims
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const idTokenResult = await user.getIdTokenResult(true); 

                if (idTokenResult.claims.admin === true) {
                    loadOrders(); 
                    
                    // NEW: Initialize offer management logic
                    if (window.adminOffers) window.adminOffers.initializeEventListeners();

                    const activeSectionIdStorage = localStorage.getItem('adminActiveSection');
                    const activeTitleStorage = localStorage.getItem('adminActiveTitle');
                    const dashboardLink = document.querySelector('aside .nav-link[data-section="dashboard-section"]'); 

                    if (activeSectionIdStorage && document.getElementById(activeSectionIdStorage)) {
                        const linkToActivate = document.querySelector(`aside .nav-link[data-section="${activeSectionIdStorage}"]`);
                        if (linkToActivate) {
                            showSection(activeSectionIdStorage, activeTitleStorage || linkToActivate.getAttribute('data-title'));
                            setActiveLink(linkToActivate);
                        }
                    } else { 
                        if (dashboardLink && document.getElementById('dashboard-section')) { 
                             showSection('dashboard-section', (typeof translations !== 'undefined' && translations[currentLang]?.dashboard_title) || 'Dashboard');
                             setActiveLink(dashboardLink);
                        }
                    }
                } else {
                    console.warn("admin.html: User is logged in but NOT an admin. Access denied.");
                    showMessage("error-message-admin-page", "Access Denied: You do not have administrator privileges.", true);
                    setTimeout(() => { window.location.href = "admin-login.html"; }, 3000);
                }
            } catch (error) {
                console.error("admin.html: Error verifying admin status:", error);
                showMessage("error-message-admin-page", `Error verifying admin status: ${error.message}`, true);
                setTimeout(() => { window.location.href = "admin-login.html"; }, 3000);
            }
        } else {
            console.log("admin.html: User is NOT logged in. Redirecting to login.");
            window.location.href = "admin-login.html";
        }
    });
});


// ---------------------- NEW: OFFERS MANAGEMENT ----------------------
window.adminOffers = {
    offersCache: {},
    editingOfferId: null,

    initializeView: function() {
        offersRef.on('value', snapshot => {
            this.offersCache = snapshot.val() || {};
            this.renderOffers();
        }, error => {
            console.error("Error loading offers:", error);
            showMessage('error-message-admin-page', 'Failed to load offers.', true);
        });
    },

    renderOffers: function() {
        const container = document.getElementById('offers-list-admin');
        container.innerHTML = '';

        if (Object.keys(this.offersCache).length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">No offers found. Add one above.</p>';
            return;
        }

        for (const offerId in this.offersCache) {
            const offer = this.offersCache[offerId];
            const card = document.createElement('div');
            card.className = 'item-card flex justify-between items-center';
            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <img src="${escapeHTML(offer.imageURL || 'https://via.placeholder.com/64')}" class="w-16 h-16 rounded-md object-cover">
                    <div>
                        <p class="font-bold">${escapeHTML(offer.name)}</p>
                        <p class="text-sm text-gray-600">${escapeHTML(offer.price)} MAD</p>
                    </div>
                </div>
                <div>
                    <button class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded" onclick="window.adminOffers.editOffer('${offerId}')">Edit</button>
                    <button class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onclick="window.adminOffers.deleteOffer('${offerId}')">Delete</button>
                </div>
            `;
            container.appendChild(card);
        }
    },

    clearForm: function() {
        this.editingOfferId = null;
        document.getElementById('offer-form-title').textContent = 'Add New Offer';
        document.getElementById('offer-name').value = '';
        document.getElementById('offer-price').value = '';
        document.getElementById('offer-image-url').value = '';
        document.getElementById('offer-short-desc').value = '';
        document.getElementById('offer-long-desc').value = '';
        document.getElementById('save-offer-btn').textContent = 'Save Offer';
    },

    populateForm: function(offerId) {
        this.editingOfferId = offerId;
        const offer = this.offersCache[offerId];
        document.getElementById('offer-form-title').textContent = 'Edit Offer';
        document.getElementById('offer-name').value = offer.name;
        document.getElementById('offer-price').value = offer.price;
        document.getElementById('offer-image-url').value = offer.imageURL;
        document.getElementById('offer-short-desc').value = offer.description;
        document.getElementById('offer-long-desc').value = offer.longDesc;
        document.getElementById('save-offer-btn').textContent = 'Update Offer';
    },

    editOffer: function(offerId) {
        this.populateForm(offerId);
        document.getElementById('offer-form-title').scrollIntoView({ behavior: 'smooth' });
    },

    deleteOffer: function(offerId) {
        if (confirm('Are you sure you want to delete this offer?')) {
            offersRef.child(offerId).remove()
                .then(() => showMessage('error-message-admin-page', 'Offer deleted successfully.'))
                .catch(err => showMessage('error-message-admin-page', `Error deleting offer: ${err.message}`, true));
        }
    },

    saveOffer: function() {
        const name = document.getElementById('offer-name').value.trim();
        const price = parseFloat(document.getElementById('offer-price').value);
        const imageURL = document.getElementById('offer-image-url').value.trim();
        const shortDesc = document.getElementById('offer-short-desc').value.trim();
        const longDesc = document.getElementById('offer-long-desc').value.trim();

        if (!name || isNaN(price) || !imageURL) {
            showMessage('error-message-admin-page', 'Name, price, and image URL are required.', true);
            return;
        }

        const offerData = { name, price, imageURL, description: shortDesc, longDesc };
        let promise;

        if (this.editingOfferId) {
            // Update existing offer
            promise = offersRef.child(this.editingOfferId).update(offerData);
        } else {
            // Add new offer
            promise = offersRef.push(offerData);
        }

        promise.then(() => {
            showMessage('error-message-admin-page', 'Offer saved successfully.');
            this.clearForm();
        }).catch(err => {
            showMessage('error-message-admin-page', `Error saving offer: ${err.message}`, true);
        });
    },

    initializeEventListeners: function() {
        document.getElementById('save-offer-btn').addEventListener('click', () => this.saveOffer());
        document.getElementById('clear-offer-form-btn').addEventListener('click', () => this.clearForm());
    }
};