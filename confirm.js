// confirm.js

// Initialize Firebase database and auth objects
const db = firebase.database();
const auth = firebase.auth();
console.log("confirm.js: Firebase 'db' and 'auth' objects initialized."); 

// --- Global variables for HTML elements (assigned in DOMContentLoaded) ---
let orderSummaryDiv;
let orderIdDisplay;
let orderTypeDisplay;
let customerNameDisplay;
let customerPhoneDisplay;
let deliveryAddressDisplay;
let itemsList;
let totalAmountDisplay;
let orderTimestampDisplay;
let orderStatusDisplay;
let errorFetchingOrderDiv;
let loadingOrderDiv; // New element for loading state
let orderSummarySection;
let savePdfBtn;
let savePdfBtnSpan;
let isGeneratingPdf = false; // Flag to prevent multiple PDF generations

let currentLang = localStorage.getItem('lang') || 'en';

// Utility function to escape HTML characters
function escapeHTML(str) { 
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : ''; 
  return String(str).replace(/[<>&"']/g, s => ({ 
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

// Function to show custom message box (reused from cart.js)
function showMessageBox(titleKey, messageKey, isError = false) {
  const messageBox = document.getElementById('custom-message-box'); 
  const messageBoxTitle = document.getElementById('message-box-title'); 
  const messageBoxText = document.getElementById('message-box-text'); 
  const messageBoxOkBtn = document.getElementById('message-box-ok-btn'); 

  let translatedTitle = (typeof translations !== 'undefined' && translations[currentLang]?.[titleKey]) || titleKey; 
  let translatedMessage = (typeof translations !== 'undefined' && translations[currentLang]?.[messageKey]) || messageKey; 
  let translatedOk = (typeof translations !== 'undefined' && translations[currentLang]?.message_box_ok) || "OK"; 

  messageBoxTitle.textContent = translatedTitle; 
  messageBoxText.textContent = translatedMessage; 
  messageBoxOkBtn.textContent = translatedOk; 

  if (isError) { 
    messageBoxTitle.classList.add('text-red-600'); 
    messageBoxOkBtn.classList.add('bg-red-600'); 
    messageBoxOkBtn.classList.remove('bg-gray-500'); 
  } else {
    messageBoxTitle.classList.remove('text-red-600'); 
    messageBoxOkBtn.classList.remove('bg-red-600'); 
  }

  messageBox.style.display = 'flex'; 
  messageBoxOkBtn.onclick = () => { 
    messageBox.style.display = 'none'; 
  };
}


// Function to format timestamp for display
function formatTimestamp(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        return date.toLocaleString(currentLang, options);
    } catch (e) {
        console.error("confirm.js: Error formatting date:", e);
        return isoString;
    }
}

// Function to update cart count in navigation bar (reused from menu/cart)
function updateCartCountNav() { 
    const cartForCount = JSON.parse(localStorage.getItem("cart")) || []; 
    const count = cartForCount.reduce((sum, i) => sum + i.quantity, 0); 
    const cartCountSpanNav = document.getElementById('cart-count-nav'); 
    if (cartCountSpanNav) { 
        cartCountSpanNav.textContent = count; 
    }
}

// Main function to load and display order details
async function loadOrderDetails() {
    // Show loading state
    if (loadingOrderDiv) loadingOrderDiv.classList.remove('hidden');
    if (errorFetchingOrderDiv) errorFetchingOrderDiv.classList.add('hidden');
    if (orderSummarySection) orderSummarySection.classList.add('hidden');

    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    console.log("confirm.js: orderId from URL:", orderId); // DEBUG: Check if orderId is correctly retrieved from URL

    if (!orderId) {
        if (loadingOrderDiv) loadingOrderDiv.classList.add('hidden');
        if (errorFetchingOrderDiv) {
            errorFetchingOrderDiv.classList.remove('hidden');
            errorFetchingOrderDiv.querySelector('#error-message-text').textContent = 
                (typeof translations !== 'undefined' && translations[currentLang]?.noOrderData) || "No order data found for this ID.";
        }
        console.log("confirm.js: No orderId found in URL. Hiding summary section."); 
        return;
    }

    const user = auth.currentUser;
    console.log("confirm.js: Current authenticated user UID:", user ? user.uid : 'No user logged in'); 

    try {
        const orderRef = db.ref('orders/' + orderId);
        const snapshot = await orderRef.once('value');
        const order = snapshot.val();
        console.log("confirm.js: Fetched order data from Firebase:", order); 

        if (loadingOrderDiv) loadingOrderDiv.classList.add('hidden'); // Hide loading once data is fetched

        if (order) {
            console.log("confirm.js: Order data found, proceeding to render."); 
            
            let isUserAdmin = false;
            if (user) {
                const idTokenResult = await user.getIdTokenResult(); 
                isUserAdmin = !!idTokenResult.claims.admin;
                console.log("confirm.js: User is admin:", isUserAdmin); 
            }

            const isOrderOwner = user && order.userId && order.userId === user.uid;
            console.log("confirm.js: Is order owner:", isOrderOwner); 
            const isDineInWithoutUser = order.orderType === 'dineIn' && !order.userId;
            console.log("confirm.js: Is dine-in without user (guest order):", isDineInWithoutUser); 

            // Permission check: Only admin, order owner, or guest dine-in order can view
            if (!isUserAdmin && !isOrderOwner && !isDineInWithoutUser) {
                if (errorFetchingOrderDiv) {
                    errorFetchingOrderDiv.classList.remove('hidden');
                    errorFetchingOrderDiv.querySelector('#error-message-text').textContent = 
                        (typeof translations !== 'undefined' && translations[currentLang]?.error_fetching_order) || "Error fetching order details. You do not have permission to view this order.";
                }
                if (orderSummarySection) orderSummarySection.classList.add('hidden');
                
                // If not logged in, prompt to log in
                if (!user) { 
                     showMessageBox('auth_customer_login', 'no_user_logged_in', true); // Use translation keys
                     setTimeout(() => { window.location.href = 'auth.html'; }, 3000);
                }
                console.log("confirm.js: Permission denied for viewing this order."); 
                return; // Stop execution here if access is denied
            }

            // If access is granted, show the summary section
            if (orderSummarySection) orderSummarySection.classList.remove('hidden');

            // Render order details
            if (orderIdDisplay) orderIdDisplay.textContent = orderId;
            if (orderTypeDisplay) orderTypeDisplay.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.[`order_type_${order.orderType}`]) || order.orderType;

            // Conditional display for customer details
            const customerNameP = customerNameDisplay ? customerNameDisplay.closest('p') : null;
            if (order.customerName && customerNameDisplay) {
                if (customerNameP) customerNameP.classList.remove('hidden');
                customerNameDisplay.textContent = escapeHTML(order.customerName);
            } else if (customerNameP) {
                customerNameP.classList.add('hidden');
            }

            const customerPhoneP = customerPhoneDisplay ? customerPhoneDisplay.closest('p') : null;
            if (order.customerPhone && customerPhoneDisplay) {
                if (customerPhoneP) customerPhoneP.classList.remove('hidden');
                customerPhoneDisplay.textContent = escapeHTML(order.customerPhone);
            } else if (customerPhoneP) {
                customerPhoneP.classList.add('hidden');
            }

            const deliveryAddressP = document.getElementById('delivery-address-display-p');
            if (order.deliveryAddress && deliveryAddressDisplay && deliveryAddressP) {
                deliveryAddressP.classList.remove('hidden');
                deliveryAddressDisplay.textContent = escapeHTML(order.deliveryAddress);
            } else if (deliveryAddressP) {
                deliveryAddressP.classList.add('hidden');
            }
            
            const tableNumberP = document.getElementById('table-number-display-p');
            const tableNumberDisplay = document.getElementById('table-number-display');
            if (order.orderType === 'dineIn' && order.table && tableNumberP && tableNumberDisplay) {
                tableNumberP.classList.remove('hidden');
                tableNumberDisplay.textContent = escapeHTML(order.table);
            } else if (tableNumberP) {
                tableNumberP.classList.add('hidden');
            }

            // Render order items
            if (itemsList) {
                itemsList.innerHTML = '';
                if (Array.isArray(order.items) && order.items.length > 0) {
                    order.items.forEach(item => {
                        const li = document.createElement('li');
                        li.className = 'flex justify-between items-center py-2';
                        li.innerHTML = `
                            <span>${escapeHTML(item.quantity)}x ${escapeHTML(item.name)}</span>
                            <span>${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)} MAD</span>
                        `;
                        itemsList.appendChild(li);
                    });
                } else {
                    console.warn("confirm.js: order.items is not an array or is empty. Cannot render items."); 
                    itemsList.innerHTML = `<p class="text-gray-500 italic" data-translate="no_items_found">No items found for this order.</p>`;
                }
            }


            if (totalAmountDisplay) totalAmountDisplay.textContent = order.total ? order.total.toFixed(2) : '0.00';
            if (orderTimestampDisplay) orderTimestampDisplay.textContent = formatTimestamp(order.timestamp);
            if (orderStatusDisplay) orderStatusDisplay.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.[`status_${order.status.toLowerCase()}`]) || order.status;

            // Apply language to rendered dynamic content
            if (typeof applyLanguage === 'function') {
                applyLanguage(currentLang, orderSummarySection);
            }

        } else {
            // No order found for the ID
            if (errorFetchingOrderDiv) {
                errorFetchingOrderDiv.classList.remove('hidden');
                errorFetchingOrderDiv.querySelector('#error-message-text').textContent = 
                    (typeof translations !== 'undefined' && translations[currentLang]?.noOrderData) || "No order data found for this ID.";
            }
            if (orderSummarySection) orderSummarySection.classList.add('hidden');
            console.log("confirm.js: Order not found in Firebase or is empty for ID:", orderId); 
        }
    } catch (error) {
        console.error("confirm.js: Caught error fetching or rendering order details:", error);
        if (loadingOrderDiv) loadingOrderDiv.classList.add('hidden');
        if (errorFetchingOrderDiv) {
            errorFetchingOrderDiv.classList.remove('hidden');
            errorFetchingOrderDiv.querySelector('#error-message-text').textContent = 
                (typeof translations !== 'undefined' && translations[currentLang]?.error_fetching_order) || `Error fetching order details: ${error.message}`;
        }
        if (orderSummarySection) orderSummarySection.classList.add('hidden');
    }
}

// Initial setup on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements AFTER the DOM is fully loaded
    orderSummaryDiv = document.getElementById('order-summary-details');
    orderIdDisplay = document.getElementById('order-id-display');
    orderTypeDisplay = document.getElementById('order-type-display');
    customerNameDisplay = document.getElementById('customer-name-display');
    customerPhoneDisplay = document.getElementById('customer-phone-display');
    deliveryAddressDisplay = document.getElementById('delivery-address-display');
    itemsList = document.getElementById('items-list');
    totalAmountDisplay = document.getElementById('total-amount-display');
    orderTimestampDisplay = document.getElementById('order-timestamp-display');
    orderStatusDisplay = document.getElementById('order-status-display');
    errorFetchingOrderDiv = document.getElementById('error-fetching-order');
    loadingOrderDiv = document.getElementById('loading-order'); // Initialize new loading div
    orderSummarySection = document.getElementById('order-summary-section');
    savePdfBtn = document.getElementById('save-pdf-btn');
    savePdfBtnSpan = savePdfBtn ? savePdfBtn.querySelector('span[data-translate="save_pdf_button"]') : null;


    // Apply initial translations to static elements
    if (typeof applyLanguage === 'function') {
        applyLanguage(currentLang);
        // Also apply to specific hardcoded texts not covered by data-translate
        const orderConfirmedTitle = document.querySelector('h1[data-translate="order_confirmed"]');
        if (orderConfirmedTitle) orderConfirmedTitle.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.order_confirmed) || "Thank you for your order!";
        const orderReceivedText = document.querySelector('p[data-translate="order_received"]');
        if (orderReceivedText) orderReceivedText.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.order_received) || "Your order has been received and is being prepared.";
    }
    updateCartCountNav(); // Update cart count in the nav bar

    // Load order details only after Firebase authentication state is known
    // This is crucial for permission checks (admin, owner)
    auth.onAuthStateChanged(async (user) => {
        await loadOrderDetails(); // Call loadOrderDetails once auth state is determined
        
        // PDF Generation Event Listener
        if (savePdfBtn) {
            savePdfBtn.addEventListener('click', () => {
                if (isGeneratingPdf) return; // Prevent multiple clicks while generating

                isGeneratingPdf = true;
                savePdfBtn.disabled = true;
                savePdfBtn.classList.add('generating'); // Add visual feedback
                if (savePdfBtnSpan) {
                    savePdfBtnSpan.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.generating_pdf_feedback) || "Generating PDF...";
                }

                const elementToPrint = document.getElementById('order-summary-section');
                // Ensure the section is visible before attempting to convert to PDF
                elementToPrint.classList.remove('hidden'); 

                const orderNumber = orderIdDisplay.textContent || 'NoOrder'; // Use actual displayed ID
                const orderTimestamp = orderTimestampDisplay.textContent.replace(/[^a-zA-Z0-9]/g, '_'); // Clean for filename
                const filename = `PizzaHut_Order_${orderNumber}_${orderTimestamp}.pdf`;

                const opt = {
                    margin: 10,
                    filename: filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, logging: false, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
                };

                html2pdf().set(opt).from(elementToPrint).save()
                    .then(() => {
                        console.log("PDF generated successfully!");
                    })
                    .catch(error => {
                        console.error("Error generating PDF:", error);
                        showMessageBox('profile_error_title', 'pdf_generation_error', true); // Use generic error title
                    })
                    .finally(() => {
                        isGeneratingPdf = false;
                        savePdfBtn.disabled = false;
                        savePdfBtn.classList.remove('generating');
                        if (savePdfBtnSpan) {
                            savePdfBtnSpan.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.save_pdf_button) || "Save as PDF";
                        }
                        // Re-hide if it was originally hidden due to permission issues
                        if (!isUserAdmin && !isOrderOwner && !isDineInWithoutUser) { // Re-evaluate condition
                            elementToPrint.classList.add('hidden');
                        }
                    });
            });
        }
    });

    // Language switcher event listener
    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        languageSwitcher.value = currentLang;
        languageSwitcher.addEventListener('change', (e) => {
            currentLang = e.target.value;
            localStorage.setItem('lang', currentLang);
            if (typeof applyLanguage === 'function') {
                applyLanguage(currentLang);
                loadOrderDetails(); // Reload order details with new language
            }
        });
    }
});
