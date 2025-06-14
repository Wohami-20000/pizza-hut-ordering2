// confirm.js

const db = firebase.database();
const auth = firebase.auth();
console.log("confirm.js: Firebase 'db' and 'auth' objects initialized."); 

// Declare variables globally, but assign them inside DOMContentLoaded
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
let orderSummarySection;
let savePdfBtn;
let savePdfBtnSpan;
let isGeneratingPdf = false;

let currentLang = localStorage.getItem('lang') || 'en';

// Utility function to escape HTML characters
function escapeHTML(str) { 
  if (typeof str !== 'string') return str !== null && str !== undefined ? String(str) : ''; 
  return String(str).replace(/[<>&"']/g, s => ({ 
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

function showMessageBox(titleKey, messageKey, isError = false) {
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
        console.error("Error formatting date:", e);
        return isoString;
    }
}

function updateCartCountNav() { 
    const cartForCount = JSON.parse(localStorage.getItem("cart")) || []; 
    const count = cartForCount.reduce((sum, i) => sum + i.quantity, 0); 
    const cartCountSpanNav = document.getElementById('cart-count-nav'); 
    if (cartCountSpanNav) { 
        cartCountSpanNav.textContent = count; 
    }
}

async function loadOrderDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    console.log("confirm.js: Found orderId in URL:", orderId); 

    if (!orderId) {
        errorFetchingOrderDiv.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.noOrderData) || "No order data found for this ID.";
        errorFetchingOrderDiv.classList.remove('hidden');
        orderSummarySection.classList.add('hidden');
        return;
    }

    errorFetchingOrderDiv.classList.add('hidden');
    orderSummaryDiv.innerHTML = `<p class="text-center py-4 text-gray-500" data-translate="loading_order_details">Loading order details...</p>`;
    if (typeof applyLanguage === 'function') applyLanguage(currentLang, orderSummaryDiv);
    orderSummarySection.classList.remove('hidden');

    const user = auth.currentUser;

    try {
        const orderRef = db.ref('orders/' + orderId);
        const snapshot = await orderRef.once('value');
        const order = snapshot.val();

        if (order) {
            console.log("confirm.js: Order data received:", order); 
            
            let isUserAdmin = false;
            if (user) {
                const idTokenResult = await user.getIdTokenResult(); 
                isUserAdmin = !!idTokenResult.claims.admin;
            }

            const isOrderOwner = user && order.userId && order.userId === user.uid;
            const isDineInWithoutUser = order.orderType === 'dineIn' && !order.userId;

            if (!isUserAdmin && !isOrderOwner && !isDineInWithoutUser) {
                errorFetchingOrderDiv.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.error_fetching_order) || "Error fetching order details. You do not have permission to view this order.";
                errorFetchingOrderDiv.classList.remove('hidden');
                orderSummarySection.classList.add('hidden');
                if (!user) { 
                     showMessageBox('no_user_logged_in_title', 'no_user_logged_in', true);
                     setTimeout(() => { window.location.href = 'auth.html'; }, 3000);
                }
                return;
            }

            // Render order details
            orderIdDisplay.textContent = orderId;
            orderTypeDisplay.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.[`order_type_${order.orderType}`]) || order.orderType;

            if (order.customerName) {
                customerNameDisplay.closest('p').classList.remove('hidden');
                customerNameDisplay.textContent = order.customerName;
            } else {
                customerNameDisplay.closest('p').classList.add('hidden');
            }
            if (order.customerPhone) {
                customerPhoneDisplay.closest('p').classList.remove('hidden');
                customerPhoneDisplay.textContent = order.customerPhone;
            } else {
                customerPhoneDisplay.closest('p').classList.add('hidden');
            }
            if (order.deliveryAddress) {
                deliveryAddressDisplay.closest('p').classList.remove('hidden');
                deliveryAddressDisplay.textContent = order.deliveryAddress;
            } else {
                deliveryAddressDisplay.closest('p').classList.add('hidden');
            }
            
            const tableNumberP = document.getElementById('table-number-display-p');
            const tableNumberDisplay = document.getElementById('table-number-display');
            if (order.orderType === 'dineIn' && order.table && tableNumberP && tableNumberDisplay) {
                tableNumberP.classList.remove('hidden');
                tableNumberDisplay.textContent = order.table;
            } else if (tableNumberP) {
                tableNumberP.classList.add('hidden');
            }

            itemsList.innerHTML = '';
            // CRITICAL FIX: Ensure order.items is an array before attempting forEach
            if (Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'flex justify-between items-center py-2';
                    li.innerHTML = `
                        <span>${escapeHTML(item.quantity)}x ${escapeHTML(item.name)}</span>
                        <span>${(item.price * item.quantity).toFixed(2)} MAD</span>
                    `;
                    itemsList.appendChild(li);
                });
            } else {
                console.warn("confirm.js: order.items is not an array or is missing. Cannot render items.");
                itemsList.innerHTML = `<p class="text-gray-500 italic" data-translate="no_items_found">No items found for this order.</p>`;
            }

            totalAmountDisplay.textContent = order.total ? order.total.toFixed(2) : '0.00';
            orderTimestampDisplay.textContent = formatTimestamp(order.timestamp);
            orderStatusDisplay.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.[`status_${order.status.toLowerCase()}`]) || order.status;

            if (typeof applyLanguage === 'function') {
                applyLanguage(currentLang, orderSummarySection);
            }

        } else {
            errorFetchingOrderDiv.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.noOrderData) || "No order data found for this ID.";
            errorFetchingOrderDiv.classList.remove('hidden');
            orderSummarySection.classList.add('hidden');
        }
    } catch (error) {
        console.error("confirm.js: Error fetching or rendering order details:", error);
        errorFetchingOrderDiv.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.error_fetching_order) || `Error fetching order details: ${error.message}`;
        errorFetchingOrderDiv.classList.remove('hidden');
        orderSummarySection.classList.add('hidden');
    }
}

// PDF generation logic
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
    orderSummarySection = document.getElementById('order-summary-section');
    savePdfBtn = document.getElementById('save-pdf-btn');
    savePdfBtnSpan = savePdfBtn ? savePdfBtn.querySelector('span[data-translate="save_pdf_button"]') : null;


    // Apply initial translations
    if (typeof applyLanguage === 'function') {
        applyLanguage(currentLang);
        const orderConfirmedTitle = document.querySelector('[data-translate="order_confirmed"]');
        if (orderConfirmedTitle) orderConfirmedTitle.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.order_confirmed) || "Thank you for your order!";
        const orderReceivedText = document.querySelector('[data-translate="order_received"]');
        if (orderReceivedText) orderReceivedText.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.order_received) || "Your order has been received and is being prepared.";
    }
    updateCartCountNav();

    // CRITICAL: Load order details only after Firebase authentication state is known
    auth.onAuthStateChanged(async (user) => {
        await loadOrderDetails();
        
        // PDF Generation Event Listener
        if (savePdfBtn) {
            savePdfBtn.addEventListener('click', () => {
                if (isGeneratingPdf) return;

                isGeneratingPdf = true;
                savePdfBtn.disabled = true;
                savePdfBtn.classList.add('generating');
                if (savePdfBtnSpan) {
                    savePdfBtnSpan.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.generating_pdf_feedback) || "Generating PDF...";
                }

                const element = document.getElementById('order-summary-section');
                element.classList.remove('hidden'); 

                const orderNumber = orderIdDisplay.textContent.substring(1) || 'NoOrder';
                const orderTimestamp = orderTimestampDisplay.textContent.replace(/[^a-zA-Z0-9]/g, '');
                const filename = `PizzaHut_Order_${orderNumber}_${orderTimestamp}.pdf`;

                const opt = {
                    margin: 10,
                    filename: filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, logging: false, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
                };

                html2pdf().set(opt).from(element).save()
                    .then(() => {
                        console.log("PDF generated successfully!");
                    })
                    .catch(error => {
                        console.error("Error generating PDF:", error);
                        showMessageBox('profile_error_title', 'pdf_generation_error', true);
                    })
                    .finally(() => {
                        isGeneratingPdf = false;
                        savePdfBtn.disabled = false;
                        savePdfBtn.classList.remove('generating');
                        if (savePdfBtnSpan) {
                            savePdfBtnSpan.textContent = (typeof translations !== 'undefined' && translations[currentLang]?.save_pdf_button) || "Save as PDF";
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
                loadOrderDetails();
            }
        });
    }
});