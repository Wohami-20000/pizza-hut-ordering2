// /js/panels/team.js

const db = firebase.database();

/**
 * Creates the HTML for a single team member card.
 */
function createMemberCard(userData) {
    const { name, email, role, lastLogin } = userData;
    const lastSeen = lastLogin ? `Last seen: ${new Date(lastLogin).toLocaleString()}` : 'Never logged in';

    return `
        <div class="bg-white p-4 rounded-lg shadow-md flex items-center space-x-4">
            <i class="fas fa-user-circle text-4xl text-gray-400"></i>
            <div class="flex-grow">
                <p class="font-bold text-gray-800">${name || 'Unnamed User'}</p>
                <p class="text-sm text-gray-600">${email}</p>
                <p class="text-xs text-gray-400">${lastSeen}</p>
            </div>
        </div>
    `;
}

/**
 * Fetches all users and groups them by role.
 */
async function loadTeamData() {
    const container = document.getElementById('team-container');
    if (!container) return;

    try {
        const usersSnapshot = await db.ref('users').orderByChild('role').once('value');
        if (!usersSnapshot.exists()) {
            container.innerHTML = '<p class="text-center text-gray-500">No users found in the database.</p>';
            return;
        }

        const users = usersSnapshot.val();
        const teams = {
            admin: [],
            manager: [],
            staff: [],
            delivery: [],
            owner: [],
        };

        // Group users by their role
        Object.values(users).forEach(user => {
            if (user.role && teams[user.role]) {
                teams[user.role].push(user);
            }
        });

        // Generate HTML for each role group
        container.innerHTML = Object.entries(teams).map(([role, members]) => {
            if (members.length === 0) return ''; // Don't show empty role sections
            
            return `
                <div class="space-y-4">
                    <h3 class="text-xl font-bold text-gray-700 capitalize border-b-2 border-brand-red pb-2">${role}s</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${members.map(createMemberCard).join('')}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error loading team data:", error);
        container.innerHTML = '<p class="text-center text-red-500">Could not load team data.</p>';
    }
}


/**
 * Main function to load the Team Management Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Team Management';

    panelRoot.innerHTML = `
        <div id="team-container" class="space-y-8">
            <div class="text-center py-20">
                <i class="fas fa-spinner fa-spin text-4xl text-brand-red"></i>
                <p class="mt-4 text-lg text-gray-600">Loading Team Roster...</p>
            </div>
        </div>
    `;

    loadTeamData();
}