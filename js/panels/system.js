// /js/panels/system.js - Redesigned for better UI/UX

const db = firebase.database();

/**
 * Shows a temporary toast notification.
 * @param {string} message - The message to display.
 * @param {boolean} isError - If true, styles the toast for an error.
 */
function showToast(message, isError = false) {
    const toastContainer = document.getElementById('toast-container') || document.createElement('div');
    if (!toastContainer.id) {
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-5 right-5 z-50';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    const bgColor = isError ? 'bg-red-600' : 'bg-green-600';
    toast.className = `${bgColor} text-white py-2 px-5 rounded-lg shadow-xl animate-fadeInUp`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
}


/**
 * Loads the current config values from Firebase into the form fields.
 */
function loadCurrentConfig() {
    const configRef = db.ref('config');
    configRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
            const config = snapshot.val();
            document.getElementById('delivery-fee').value = config.deliveryFee || 0;
            document.getElementById('tax-rate').value = config.taxRate || 0;
            document.getElementById('announcement-message').value = config.announcement?.message || '';
            document.getElementById('announcement-enabled').checked = config.announcement?.enabled || false;
        }
    }).catch(error => {
        console.error("Error loading system config:", error);
        showToast("Could not load current settings.", true);
    });
}

/**
 * Handles the form submission to save the new configuration.
 * @param {Event} e - The form submission event.
 */
function saveConfig(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-config-btn');
    const originalBtnHTML = saveBtn.innerHTML;

    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    saveBtn.disabled = true;

    const newConfig = {
        deliveryFee: parseFloat(document.getElementById('delivery-fee').value),
        taxRate: parseFloat(document.getElementById('tax-rate').value),
        announcement: {
            message: document.getElementById('announcement-message').value,
            enabled: document.getElementById('announcement-enabled').checked
        }
    };

    db.ref('config').set(newConfig)
        .then(() => {
            showToast('System configuration saved successfully!');
        })
        .catch(error => {
            showToast('Error saving configuration: ' + error.message, true);
        })
        .finally(() => {
            saveBtn.innerHTML = originalBtnHTML;
            saveBtn.disabled = false;
        });
}

/**
 * Main function to set up and load the System Configuration Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'System Configuration';

    panelRoot.innerHTML = `
        <style>
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fadeInUp { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
        </style>
        <div class="max-w-3xl mx-auto">
             <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition mb-6 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>Back to Dashboard
            </button>
            <div class="bg-white rounded-2xl shadow-xl p-6">
                <div class="border-b pb-4 mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">Global Settings</h2>
                    <p class="text-sm text-gray-500 mt-1">Manage system-wide settings like fees, taxes, and announcements.</p>
                </div>
                <form id="system-config-form" class="space-y-8">
                    
                    <!-- Financials Section -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-3"><i class="fas fa-dollar-sign text-gray-400"></i>Financials</h3>
                        <div class="space-y-4 pl-8">
                            <div>
                                <label for="delivery-fee" class="block text-sm font-medium text-gray-600">Delivery Fee (MAD)</label>
                                <input type="number" id="delivery-fee" step="0.01" required class="w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red">
                            </div>
                            <div>
                                <label for="tax-rate" class="block text-sm font-medium text-gray-600">Tax Rate (%)</label>
                                <input type="number" id="tax-rate" step="0.01" required class="w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red" placeholder="e.g., 20 for 20%">
                            </div>
                        </div>
                    </div>

                    <!-- Announcement Section -->
                    <div class="border-t pt-6">
                        <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-3"><i class="fas fa-bullhorn text-gray-400"></i>Announcement Banner</h3>
                         <div class="space-y-4 pl-8">
                            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <label for="announcement-enabled" class="font-medium text-gray-800">Enable Announcement Banner</label>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="announcement-enabled" class="sr-only peer">
                                    <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </div>
                            <div>
                                <label for="announcement-message" class="block text-sm font-medium text-gray-600">Banner Message</label>
                                <textarea id="announcement-message" rows="3" class="w-full mt-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-brand-red focus:border-brand-red" placeholder="e.g., We are closed for Eid al-Adha."></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <div class="pt-6 border-t">
                        <button type="submit" id="save-config-btn" class="w-full bg-brand-red text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition-transform transform hover:scale-105 flex items-center justify-center gap-2">
                            <i class="fas fa-save"></i> Save Configuration
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Attach event listener and load initial data
    document.getElementById('system-config-form').addEventListener('submit', saveConfig);
    loadCurrentConfig();
}
