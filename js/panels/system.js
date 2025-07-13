// /js/panels/system.js

const db = firebase.database();

/**
 * Loads the current config values into the form fields.
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
    });
}

/**
 * Handles the form submission to save the new config.
 */
function saveConfig(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-config-btn');
    saveBtn.textContent = 'Saving...';
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
            alert('System configuration saved successfully!');
        })
        .catch(error => {
            alert('Error saving configuration: ' + error.message);
        })
        .finally(() => {
            saveBtn.textContent = 'Save Configuration';
            saveBtn.disabled = false;
        });
}

/**
 * Main function to load the System Config Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'System Configuration';

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Global Settings</h2>
            <form id="system-config-form" class="space-y-6">
                
                <div>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Financials</h3>
                    <div class="space-y-4">
                        <div>
                            <label for="delivery-fee" class="block text-sm font-medium">Delivery Fee (MAD)</label>
                            <input type="number" id="delivery-fee" step="0.01" required class="w-full mt-1 p-2 border rounded-md">
                        </div>
                        <div>
                            <label for="tax-rate" class="block text-sm font-medium">Tax Rate (%)</label>
                            <input type="number" id="tax-rate" step="0.01" required class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., 20 for 20%">
                        </div>
                    </div>
                </div>

                <div class="border-t pt-6">
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Announcement Banner</h3>
                     <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <label for="announcement-enabled" class="font-medium">Enable Announcement Banner</label>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="announcement-enabled" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                    <div class="mt-4">
                        <label for="announcement-message" class="block text-sm font-medium">Banner Message</label>
                        <textarea id="announcement-message" rows="2" class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., We are closed for Eid al-Adha."></textarea>
                    </div>
                </div>

                <div class="pt-4">
                    <button type="submit" id="save-config-btn" class="w-full bg-brand-red text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition">
                        Save Configuration
                    </button>
                </div>
            </form>
        </div>
    `;

    // Attach event listener and load initial data
    document.getElementById('system-config-form').addEventListener('submit', saveConfig);
    loadCurrentConfig();
}