// /js/panels/analytics.js - Redesigned for better UI/UX

const db = firebase.database();

/**
 * Creates the HTML for a single statistic card.
 * @param {string} icon - Font Awesome icon class (e.g., 'fa-dollar-sign').
 * @param {string} title - The title of the statistic.
 * @param {string} value - The value of the statistic.
 * @param {string} color - The base color for styling (e.g., 'green', 'blue').
 * @param {number} delay - Animation delay in ms.
 * @returns {string} The HTML string for the stat card.
 */
function createStatCard(icon, title, value, color, delay) {
    return `
        <div class="bg-white rounded-2xl shadow-lg p-6 flex items-center space-x-4 animate-fadeInUp" style="animation-delay: ${delay}ms;">
            <div class="bg-${color}-100 p-4 rounded-full">
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
 * @param {object} item - The item data { name, count }.
 * @param {number} rank - The rank of the item.
 * @returns {string} The HTML string for the list row.
 */
function createPopularItemRow(item, rank) {
    return `
        <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <div class="flex items-center">
                <span class="text-lg font-bold text-gray-400 w-8">${rank}.</span>
                <p class="font-semibold text-gray-700">${item.name}</p>
            </div>
            <p class="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-md text-sm">${item.count} sold</p>
        </div>
    `;
}

/**
 * Creates the HTML for a single customer satisfaction rating with stars.
 * @param {string} category - The name of the rating category.
 * @param {number} rating - The average rating score.
 * @returns {string} The HTML string for the rating display.
 */
function createRatingDisplay(category, rating) {
    const renderStars = (score) => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star text-xl ${i <= Math.round(score) ? 'text-yellow-400' : 'text-gray-300'}"></i>`;
        }
        return stars;
    };
    return `
        <div class="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
            <span class="font-semibold text-gray-700">${category}:</span>
            <div class="flex items-center gap-3">
                <div class="flex gap-1">${renderStars(rating)}</div>
                <span class="font-bold text-gray-600 w-10 text-right">(${rating.toFixed(1)})</span>
            </div>
        </div>
    `;
}

/**
 * Fetches all orders and calculates the analytics data.
 */
async function calculateAnalytics() {
    const statsContainer = document.getElementById('stats-container');
    const popularItemsContainer = document.getElementById('popular-items-container');
    const revenueByOrderTypeContainer = document.getElementById('revenue-by-order-type-container');
    const customerSatisfactionContainer = document.getElementById('customer-satisfaction-container');

    try {
        const ordersSnapshot = await db.ref('orders').once('value');
        if (!ordersSnapshot.exists()) {
            panelRoot.innerHTML = '<p class="text-center text-gray-500 col-span-full">No order data available to generate analytics.</p>';
            return;
        }

        const orders = Object.values(ordersSnapshot.val());
        const feedbackSnapshot = await db.ref('general_feedback').once('value');
        const generalFeedback = feedbackSnapshot.exists() ? Object.values(feedbackSnapshot.val()) : [];
        orders.forEach(order => order.feedback && generalFeedback.push(order.feedback));

        // 1. Calculate Key Stats
        const totalRevenue = orders.reduce((sum, order) => sum + order.priceDetails.finalTotal, 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        statsContainer.innerHTML = `
            ${createStatCard('fa-dollar-sign', 'Total Revenue', `${totalRevenue.toFixed(2)} MAD`, 'green', 100)}
            ${createStatCard('fa-receipt', 'Total Orders', totalOrders, 'blue', 200)}
            ${createStatCard('fa-calculator', 'Average Order Value', `${averageOrderValue.toFixed(2)} MAD`, 'yellow', 300)}
        `;

        // 2. Revenue by Order Type
        let dineInRevenue = 0;
        let deliveryRevenue = 0;
        let pickupRevenue = 0;
        orders.forEach(order => {
            if (order.orderType === 'dineIn') dineInRevenue += order.priceDetails.finalTotal;
            else if (order.orderType === 'delivery') deliveryRevenue += order.priceDetails.finalTotal;
            else if (order.orderType === 'pickup') pickupRevenue += order.priceDetails.finalTotal;
        });
        
        const maxRevenue = Math.max(dineInRevenue, deliveryRevenue, pickupRevenue, 1); // Avoid division by zero
        const dineInHeight = (dineInRevenue / maxRevenue) * 100;
        const deliveryHeight = (deliveryRevenue / maxRevenue) * 100;
        const pickupHeight = (pickupRevenue / maxRevenue) * 100;

        revenueByOrderTypeContainer.innerHTML = `
            <div class="flex justify-around items-end h-48 gap-4">
                <div class="text-center flex flex-col items-center justify-end h-full">
                    <div class="w-16 bg-blue-200 rounded-t-lg" style="height: ${deliveryHeight}%; transition: height 0.5s ease-out;"></div>
                    <p class="text-xs font-bold mt-2">${deliveryRevenue.toFixed(0)}</p>
                    <p class="text-xs text-gray-500">Delivery</p>
                </div>
                <div class="text-center flex flex-col items-center justify-end h-full">
                    <div class="w-16 bg-green-200 rounded-t-lg" style="height: ${dineInHeight}%; transition: height 0.5s ease-out;"></div>
                    <p class="text-xs font-bold mt-2">${dineInRevenue.toFixed(0)}</p>
                    <p class="text-xs text-gray-500">Dine-In</p>
                </div>
                <div class="text-center flex flex-col items-center justify-end h-full">
                    <div class="w-16 bg-yellow-200 rounded-t-lg" style="height: ${pickupHeight}%; transition: height 0.5s ease-out;"></div>
                    <p class="text-xs font-bold mt-2">${pickupRevenue.toFixed(0)}</p>
                    <p class="text-xs text-gray-500">Pickup</p>
                </div>
            </div>
        `;

        // 3. Customer Satisfaction
        let totalFood = 0, totalDelivery = 0, totalOverall = 0, feedbackCount = 0;
        generalFeedback.forEach(fb => {
            if (fb.ratings) {
                totalFood += fb.ratings.food || 0;
                totalDelivery += fb.ratings.delivery || 0;
                totalOverall += fb.ratings.overall || 0;
                feedbackCount++;
            }
        });
        const avgFood = feedbackCount > 0 ? totalFood / feedbackCount : 0;
        const avgDelivery = feedbackCount > 0 ? totalDelivery / feedbackCount : 0;
        const avgOverall = feedbackCount > 0 ? totalOverall / feedbackCount : 0;
        customerSatisfactionContainer.innerHTML = `
            ${createRatingDisplay('Food Quality', avgFood)}
            ${createRatingDisplay('Delivery Service', avgDelivery)}
            ${createRatingDisplay('Overall Experience', avgOverall)}
            <p class="text-xs text-gray-500 text-center mt-2">Based on ${feedbackCount} feedback submissions.</p>
        `;

        // 4. Most Popular Items
        const itemCounts = {};
        orders.forEach(order => order.items.forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        }));
        const sortedItems = Object.entries(itemCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        if (sortedItems.length > 0) {
            popularItemsContainer.innerHTML = sortedItems.map((item, i) => createPopularItemRow(item, i + 1)).join('');
        } else {
            popularItemsContainer.innerHTML = '<p class="text-center text-gray-500">No items have been ordered yet.</p>';
        }

    } catch (error) {
        console.error("Error calculating analytics:", error);
        statsContainer.innerHTML = `<p class="text-center text-red-500 col-span-full">Could not load analytics data: ${error.message}</p>`;
    }
}

/**
 * Main function to load the Analytics Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Business Analytics';

    panelRoot.innerHTML = `
        <style>
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fadeInUp { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; }
        </style>
        <div class="space-y-8">
            <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition mb-2 flex items-center gap-2">
                <i class="fas fa-arrow-left"></i>Back to Dashboard
            </button>
            <div id="stats-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Stat cards will be injected here -->
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 animate-fadeInUp" style="animation-delay: 400ms;">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Most Popular Items</h3>
                    <div id="popular-items-container" class="space-y-1"></div>
                </div>
                <div class="space-y-8">
                    <div class="bg-white rounded-2xl shadow-lg p-6 animate-fadeInUp" style="animation-delay: 500ms;">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Revenue by Type</h3>
                        <div id="revenue-by-order-type-container"></div>
                    </div>
                    <div class="bg-white rounded-2xl shadow-lg p-6 animate-fadeInUp" style="animation-delay: 600ms;">
                        <h3 class="text-xl font-bold text-gray-800 mb-4">Customer Satisfaction</h3>
                        <div id="customer-satisfaction-container" class="space-y-3"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    calculateAnalytics();
}
