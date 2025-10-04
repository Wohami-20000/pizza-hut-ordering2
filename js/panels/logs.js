// /js/panels/logs.js

let db, auth;
let allLogs = [];
let usersCache = {};

/**
 * A reusable function to log an admin action to Firebase.
 * Can be imported and used by any panel.
 * @param {string} actionType - The type of action (e.g., "create", "update", "delete", "reorder").
 * @param {string} itemName - The name of the item being affected.
 * @param {string} itemId - The ID of the item being affected.
 * @param {object} [changes={}] - An object describing the changes made.
 */
export async function logAction(actionType, itemName, itemId, changes = {}) {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error("Log Action Error: No authenticated user.");
            return;
        }

        const logEntry = {
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            adminUid: user.uid,
            adminName: user.displayName || user.email,
            actionType,
            itemName,
            itemId,
            changes
        };

        await firebase.database().ref('logs').push(logEntry);
    } catch (error) {
        console.error("Failed to log action:", error);
    }
}


/**
 * Fetches all users to map UIDs to names for filtering.
 */
async function fetchUsers() {
    try {
        const snapshot = await db.ref('users').once('value');
        if (snapshot.exists()) {
            usersCache = snapshot.val();
            populateAdminFilter();
        }
    } catch (error) {
        console.error("Error fetching users:", error);
    }
}

/**
 * Populates the admin filter dropdown with users who have logs.
 */
function populateAdminFilter() {
    const adminFilter = document.getElementById('log-admin-filter');
    if (!adminFilter) return;

    const adminsInLogs = [...new Set(allLogs.map(log => log.adminUid))];
    adminFilter.innerHTML = '<option value="all">All Admins</option>';

    adminsInLogs.forEach(uid => {
        const adminName = usersCache[uid]?.name || allLogs.find(log => log.adminUid === uid)?.adminName || uid;
        const option = new Option(adminName, uid);
        adminFilter.add(option);
    });
}

/**
 * Renders the logs in the table based on current filters.
 */
function renderLogs() {
    const tbody = document.getElementById('logs-tbody');
    const searchFilter = document.getElementById('log-search-filter').value.toLowerCase();
    const adminFilter = document.getElementById('log-admin-filter').value;
    const actionFilter = document.getElementById('log-action-filter').value;

    if (!tbody) return;

    const filteredLogs = allLogs.filter(log => {
        const searchMatch = !searchFilter ||
            log.itemName?.toLowerCase().includes(searchFilter) ||
            log.itemId?.toLowerCase().includes(searchFilter);
        const adminMatch = adminFilter === 'all' || log.adminUid === adminFilter;
        const actionMatch = actionFilter === 'all' || log.actionType === actionFilter;
        return searchMatch && adminMatch && actionMatch;
    });

    if (filteredLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-gray-500">No logs match the current filters.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredLogs.map(log => createLogRow(log)).join('');
}

/**
 * Creates the HTML for a single log row.
 */
function createLogRow(log) {
    const { timestamp, adminName, actionType, itemName, itemId, changes } = log;
    const date = new Date(timestamp).toLocaleString();

    let iconHtml = '';
    switch (actionType) {
        case 'create':
            iconHtml = '<i class="fas fa-plus-circle text-green-500" title="Create"></i>';
            break;
        case 'update':
            iconHtml = '<i class="fas fa-pencil-alt text-yellow-500" title="Update"></i>';
            break;
        case 'delete':
            iconHtml = '<i class="fas fa-trash-alt text-red-500" title="Delete"></i>';
            break;
        case 'reorder':
            iconHtml = '<i class="fas fa-sort text-blue-500" title="Reorder"></i>';
            break;
        default:
            iconHtml = '<i class="fas fa-info-circle text-gray-500" title="Info"></i>';
    }

    // Format the changes object for display
    let changesHtml = '<pre class="text-xs bg-gray-100 p-2 rounded-md max-h-40 overflow-auto">No detailed changes recorded.</pre>';
    if (changes && Object.keys(changes).length > 0) {
        // Simple JSON stringify for a quick and readable format
        changesHtml = `<pre class="text-xs bg-gray-100 p-2 rounded-md max-h-40 overflow-auto">${JSON.stringify(changes, null, 2)}</pre>`;
    }
    
    return `
        <tr class="hover:bg-gray-50">
            <td class="p-3 text-sm text-gray-500 whitespace-nowrap">${date}</td>
            <td class="p-3 text-sm text-gray-700 font-medium">${adminName || 'Unknown'}</td>
            <td class="p-3 text-sm text-center capitalize">
                <span class="flex items-center justify-center gap-2">
                    ${iconHtml}
                    <span>${actionType}</span>
                </span>
            </td>
            <td class="p-3 text-sm text-gray-800">
                <p class="font-semibold">${itemName || 'N/A'}</p>
                <p class="text-xs text-gray-400 font-mono">${itemId || 'N/A'}</p>
            </td>
            <td class="p-3 text-sm text-gray-600">${changesHtml}</td>
        </tr>
    `;
}

/**
 * Main function to load the Audit Log Panel.
 */
export function loadPanel(root, panelTitle, database, authentication) {
    db = database;
    auth = authentication;
    panelTitle.textContent = 'Audit Log';

    root.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-4 text-gray-800">Change History</h2>
            
            <!-- Filters -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <input type="text" id="log-search-filter" placeholder="Search item name or ID..." class="border p-2 rounded-md">
                <select id="log-admin-filter" class="border p-2 rounded-md bg-white">
                    <option value="all">All Admins</option>
                </select>
                <select id="log-action-filter" class="border p-2 rounded-md bg-white">
                    <option value="all">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="reorder">Reorder</option>
                </select>
            </div>

            <!-- Log Table -->
            <div class="overflow-x-auto border rounded-lg">
                <table class="min-w-full text-left">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="p-3 text-xs font-semibold uppercase">Timestamp</th>
                            <th class="p-3 text-xs font-semibold uppercase">Admin</th>
                            <th class="p-3 text-center text-xs font-semibold uppercase">Action</th>
                            <th class="p-3 text-xs font-semibold uppercase">Item</th>
                            <th class="p-3 text-xs font-semibold uppercase">Details</th>
                        </tr>
                    </thead>
                    <tbody id="logs-tbody" class="divide-y">
                        <tr><td colspan="5" class="text-center p-8 text-gray-500">
                            <i class="fas fa-spinner fa-spin mr-2"></i>Loading logs...
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Attach filter event listeners
    document.getElementById('log-search-filter').addEventListener('input', renderLogs);
    document.getElementById('log-admin-filter').addEventListener('change', renderLogs);
    document.getElementById('log-action-filter').addEventListener('change', renderLogs);
    
    // Initial fetch
    fetchUsers();

    // Real-time listener for logs
    const logsRef = db.ref('logs').orderByChild('timestamp');
    logsRef.on('value', snapshot => {
        allLogs = [];
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                allLogs.push({ id: child.key, ...child.val() });
            });
            allLogs.reverse(); // Sort newest first
        }
        populateAdminFilter();
        renderLogs();
    });
}
