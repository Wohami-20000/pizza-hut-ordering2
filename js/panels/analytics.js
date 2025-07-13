// /js/panels/analytics.js

const db = firebase.database();

/**
 * Creates the HTML for a single statistic card.
 */
function createStatCard(icon, title, value, color) {
    return `
        <div class="bg-white rounded-xl shadow-lg p-6 flex items-center space-x-4 animate-fadeInUp">
            <div class="bg-${color}-100 p-3 rounded-full">
                <i class="fas ${icon} text-2xl text-${color}-600"></i>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500">${title}</p>
                <p class="text-3xl font-bold text-gray-800">${value}</p>
            </div>
        </div>
    `;
}

/**
 * Creates the HTML for a single row in the popular items list.
 */
function createPopularItemRow(item, rank) {
    return `
        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div class="flex items-center">
                <span class="text-lg font-bold text-gray-400 w-8">${rank}.</span>
                <p class="font-semibold text-gray-700">${item.name}</p>
            </div>
            <p class="font-bold text-gray-800">${item.count} orders</p>
        </div>
    `;
}

/**
 * Fetches all orders and calculates the analytics.
 */
async function calculateAnalytics() {
    const statsContainer = document.getElementById('stats-container');
    const popularItemsContainer = document.getElementById('popular-items-container');
    if (!statsContainer || !popularItemsContainer) return;

    try {
        const ordersSnapshot = await db.ref('orders').once('value');
        if (!ordersSnapshot.exists()) {
            statsContainer.innerHTML = '<p class="text-center col-span-full">No order data available to generate analytics.</p>';
            return;
        }

        const orders = Object.values(ordersSnapshot.val());

        // 1. Calculate Key Stats
        const totalRevenue = orders.reduce((sum, order) => sum + order.priceDetails.finalTotal, 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalRevenue / totalOrders;

        statsContainer.innerHTML = `
            ${createStatCard('fa-dollar-sign', 'Total Revenue', `${totalRevenue.toFixed(2)} MAD`, 'green')}
            ${createStatCard('fa-receipt', 'Total Orders', totalOrders, 'blue')}
            ${createStatCard('fa-calculator', 'Average Order Value', `${averageOrderValue.toFixed(2)} MAD`, 'yellow')}
        `;

        // 2. Calculate Most Popular Items
        const itemCounts = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });

        const sortedItems = Object.entries(itemCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Get top 10 items

        if (sortedItems.length > 0) {
            popularItemsContainer.innerHTML = sortedItems.map((item, index) => createPopularItemRow(item, index + 1)).join('');
        } else {
            popularItemsContainer.innerHTML = '<p class="text-center text-gray-500">No items have been ordered yet.</p>';
        }

    } catch (error) {
        console.error("Error calculating analytics:", error);
        statsContainer.innerHTML = '<p class="text-center text-red-500 col-span-full">Could not load analytics data.</p>';
    }
}

/**
 * Main function to load the Analytics Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Business Analytics';

    panelRoot.innerHTML = `
        <div class="space-y-8">
            <div id="stats-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="col-span-full text-center py-10">
                    <i class="fas fa-spinner fa-spin text-3xl text-brand-red"></i>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp" style="animation-delay: 200ms;">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Most Popular Items</h3>
                <div id="popular-items-container" class="space-y-2">
                     <p class="text-center text-gray-500">Calculating...</p>
                </div>
            </div>
        </div>
    `;

    calculateAnalytics();
}