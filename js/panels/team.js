// /js/panels/team.js - Redesigned for better UI/UX

const db = firebase.database();

const ROLE_CONFIG = {
    owner: { color: 'bg-red-500', icon: 'fa-crown' },
    admin: { color: 'bg-purple-500', icon: 'fa-user-shield' },
    manager: { color: 'bg-blue-500', icon: 'fa-user-tie' },
    staff: { color: 'bg-green-500', icon: 'fa-user' },
    delivery: { color: 'bg-yellow-500', icon: 'fa-biking' },
    default: { color: 'bg-gray-400', icon: 'fa-user' }
};

/**
 * Creates the HTML for a single team member card.
 * @param {object} userData - The user's data object.
 * @returns {string} The HTML string for the member card.
 */
function createMemberCard(userData) {
    const { name, email, role, lastLogin } = userData;
    const lastSeen = lastLogin ? `Last seen: ${new Date(lastLogin).toLocaleString()}` : 'Never logged in';
    const roleInfo = ROLE_CONFIG[role] || ROLE_CONFIG.default;

    return `
        <div class="bg-white p-4 rounded-xl shadow-md flex items-center space-x-4 transition-transform transform hover:scale-105">
            <div class="w-12 h-12 rounded-full ${roleInfo.color} flex items-center justify-center text-white shadow-lg">
                <i class="fas ${roleInfo.icon} text-xl"></i>
            </div>
            <div class="flex-grow">
                <p class="font-bold text-gray-800">${name || 'Unnamed User'}</p>
                <p class="text-sm text-gray-600">${email}</p>
                <p class="text-xs text-gray-400 mt-1">${lastSeen}</p>
            </div>
        </div>
    `;
}

/**
 * Fetches all users and groups them by role into an accordion UI.
 */
async function loadTeamData() {
    const container = document.getElementById('team-accordion-container');
    const loadingPlaceholder = document.getElementById('loading-placeholder');
    if (!container || !loadingPlaceholder) return;

    try {
        const usersSnapshot = await db.ref('users').orderByChild('role').once('value');
        if (!usersSnapshot.exists()) {
            loadingPlaceholder.innerHTML = '<p class="text-center text-gray-500">No users with roles found in the database.</p>';
            return;
        }

        const users = usersSnapshot.val();
        const teams = {
            owner: [],
            admin: [],
            manager: [],
            staff: [],
            delivery: [],
        };

        // Group users by their role
        Object.values(users).forEach(user => {
            if (user.role && teams[user.role]) {
                teams[user.role].push(user);
            }
        });

        loadingPlaceholder.style.display = 'none';
        container.innerHTML = ''; // Clear container

        // Generate HTML for each role group as an accordion item
        Object.entries(teams).forEach(([role, members], index) => {
            if (members.length === 0) return; // Don't show empty role sections
            
            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item bg-white rounded-xl shadow-lg overflow-hidden';
            accordionItem.innerHTML = `
                <button class="accordion-header w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 transition-colors">
                    <span class="text-lg font-bold text-gray-700 capitalize flex items-center gap-3">
                        <i class="fas ${ROLE_CONFIG[role].icon} text-gray-500"></i>
                        ${role}s
                    </span>
                    <div class="flex items-center gap-3">
                        <span class="bg-gray-200 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full">${members.length} Members</span>
                        <i class="accordion-icon fas fa-chevron-down transition-transform text-gray-500"></i>
                    </div>
                </button>
                <div class="accordion-content" style="max-height: 0;">
                    <div class="p-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${members.map(createMemberCard).join('')}
                    </div>
                </div>
            `;
            container.appendChild(accordionItem);

            // Add event listener for the accordion functionality
            const header = accordionItem.querySelector('.accordion-header');
            const content = accordionItem.querySelector('.accordion-content');
            const icon = accordionItem.querySelector('.accordion-icon');

            header.addEventListener('click', () => {
                const isOpen = content.style.maxHeight !== '0px';
                content.style.maxHeight = isOpen ? '0px' : `${content.scrollHeight}px`;
                icon.classList.toggle('rotate-180', !isOpen);
            });

            // Open the first section by default
            if (index === 0) {
                setTimeout(() => header.click(), 100);
            }
        });

    } catch (error) {
        console.error("Error loading team data:", error);
        loadingPlaceholder.innerHTML = '<p class="text-center text-red-500">Could not load team data.</p>';
    }
}


/**
 * Main function to load the Team Management Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Team Management';

    panelRoot.innerHTML = `
        <style>
            .accordion-content { overflow: hidden; transition: max-height 0.3s ease-out; }
            .accordion-icon { transition: transform 0.3s ease-out; }
            .rotate-180 { transform: rotate(180deg); }
        </style>
        <div class="space-y-6">
            <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition mb-2 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>Back to Dashboard
            </button>
            <div class="border-b pb-4">
                <h2 class="text-2xl font-bold text-gray-800">Team Roster</h2>
                <p class="text-sm text-gray-500 mt-1">An overview of all staff members grouped by their role.</p>
            </div>
            <div id="team-accordion-container" class="space-y-4">
                <div id="loading-placeholder" class="text-center py-20 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl text-brand-red"></i>
                    <p class="mt-3">Loading team roster...</p>
                </div>
            </div>
        </div>
    `;

    loadTeamData();
}
