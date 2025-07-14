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
 * Creates the HTML for a single customer satisfaction rating.
 */
function createRatingDisplay(category, rating) {
    const renderStars = (score) => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star ${i <= score ? 'text-yellow-400' : 'text-gray-300'}"></i>`;
        }
        return stars;
    };
    return `
        <div class="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <span class="font-semibold text-gray-700">${category}:</span>
            <div>${renderStars(rating)} <span class="ml-2 text-gray-600">(${rating.toFixed(1)})</span></div>
        </div>
    `;
}

/**
 * Fetches all orders and calculates the analytics.
 */
async function calculateAnalytics() {
    const statsContainer = document.getElementById('stats-container');
    const popularItemsContainer = document.getElementById('popular-items-container');
    const salesOverTimeContainer = document.getElementById('sales-over-time-container');
    const revenueByOrderTypeContainer = document.getElementById('revenue-by-order-type-container');
    const customerSatisfactionContainer = document.getElementById('customer-satisfaction-container');

    if (!statsContainer || !popularItemsContainer || !salesOverTimeContainer || !revenueByOrderTypeContainer || !customerSatisfactionContainer) return;

    try {
        const ordersSnapshot = await db.ref('orders').once('value');
        const feedbackSnapshot = await db.ref('general_feedback').once('value');

        if (!ordersSnapshot.exists()) {
            statsContainer.innerHTML = '<p class="text-center col-span-full">No order data available to generate analytics.</p>';
            return;
        }

        const orders = Object.values(ordersSnapshot.val());
        const generalFeedback = feedbackSnapshot.exists() ? Object.values(feedbackSnapshot.val()) : [];

        // Combine order-specific feedback
        orders.forEach(order => {
            if (order.feedback) {
                generalFeedback.push(order.feedback);
            }
        });


        // 1. Calculate Key Stats (Existing)
        const totalRevenue = orders.reduce((sum, order) => sum + order.priceDetails.finalTotal, 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        statsContainer.innerHTML = `
            ${createStatCard('fa-dollar-sign', 'Total Revenue', `${totalRevenue.toFixed(2)} MAD`, 'green')}
            ${createStatCard('fa-receipt', 'Total Orders', totalOrders, 'blue')}
            ${createStatCard('fa-calculator', 'Average Order Value', `${averageOrderValue.toFixed(2)} MAD`, 'yellow')}
        `;

        // 2. Sales Over Time (Daily, Weekly, Monthly)
        const dailySales = {};
        const weeklySales = {};
        const monthlySales = {};
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        orders.forEach(order => {
            const orderDate = new Date(order.timestamp);
            const dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const weekKey = `${orderDate.getFullYear()}-W${Math.ceil(orderDate.getDate() / 7)}`; // Rough week number
            const monthKey = `${orderDate.getFullYear()}-${(orderDate.getMonth() + 1).toString().padStart(2, '0')}`;

            dailySales[dateKey] = (dailySales[dateKey] || 0) + order.priceDetails.finalTotal;
            weeklySales[weekKey] = (weeklySales[weekKey] || 0) + order.priceDetails.finalTotal;
            monthlySales[monthKey] = (monthlySales[monthKey] || 0) + order.priceDetails.finalTotal;
        });

        // Get recent sales
        const todayKey = now.toISOString().split('T')[0];
        const last7DaysSales = orders
            .filter(order => (now - new Date(order.timestamp)) < (7 * oneDay))
            .reduce((sum, order) => sum + order.priceDetails.finalTotal, 0);
        
        const last30DaysSales = orders
            .filter(order => (now - new Date(order.timestamp)) < (30 * oneDay))
            .reduce((sum, order) => sum + order.priceDetails.finalTotal, 0);


        salesOverTimeContainer.innerHTML = `
            ${createStatCard('fa-sun', 'Today\'s Sales', `${(dailySales[todayKey] || 0).toFixed(2)} MAD`, 'orange')}
            ${createStatCard('fa-calendar-week', 'Last 7 Days Sales', `${last7DaysSales.toFixed(2)} MAD`, 'purple')}
            ${createStatCard('fa-calendar-alt', 'Last 30 Days Sales', `${last30DaysSales.toFixed(2)} MAD`, 'teal')}
        `;


        // 3. Revenue from Dine-in vs Delivery
        let dineInRevenue = 0;
        let deliveryRevenue = 0;
        orders.forEach(order => {
            if (order.orderType === 'dineIn') {
                dineInRevenue += order.priceDetails.finalTotal;
            } else if (order.orderType === 'delivery') {
                deliveryRevenue += order.priceDetails.finalTotal;
            }
        });

        revenueByOrderTypeContainer.innerHTML = `
            ${createStatCard('fa-utensils', 'Dine-In Revenue', `${dineInRevenue.toFixed(2)} MAD`, 'red')}
            ${createStatCard('fa-motorcycle', 'Delivery Revenue', `${deliveryRevenue.toFixed(2)} MAD`, 'blue')}
        `;

        // 4. Customer Satisfaction Trends (Average Ratings)
        let totalFoodRating = 0;
        let totalDeliveryRating = 0;
        let totalOverallRating = 0;
        let feedbackCount = 0;

        generalFeedback.forEach(fb => {
            if (fb.ratings) {
                totalFoodRating += fb.ratings.food || 0;
                totalDeliveryRating += fb.ratings.delivery || 0;
                totalOverallRating += fb.ratings.overall || 0;
                feedbackCount++;
            }
        });

        const avgFoodRating = feedbackCount > 0 ? totalFoodRating / feedbackCount : 0;
        const avgDeliveryRating = feedbackCount > 0 ? totalDeliveryRating / feedbackCount : 0;
        const avgOverallRating = feedbackCount > 0 ? totalOverallRating / feedbackCount : 0;

        customerSatisfactionContainer.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800 mb-4">Customer Satisfaction</h3>
            <div class="space-y-3">
                ${createRatingDisplay('Food Quality', avgFoodRating)}
                ${createRatingDisplay('Delivery Service', avgDeliveryRating)}
                ${createRatingDisplay('Overall Experience', avgOverallRating)}
                <p class="text-sm text-gray-500 text-center mt-4">Based on ${feedbackCount} feedback submissions.</p>
            </div>
        `;


        // 5. Calculate Most Popular Items (Existing)
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
            <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition mb-4">
                <i class="fas fa-arrow-left mr-2"></i>Back
            </button>
            <div id="stats-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="col-span-full text-center py-10">
                    <i class="fas fa-spinner fa-spin text-3xl text-brand-red"></i>
                    <p class="mt-4 text-lg text-gray-600">Loading Key Metrics...</p>
                </div>
            </div>

            <div id="sales-over-time-panel" class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp" style="animation-delay: 100ms;">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Sales Over Time</h3>
                <div id="sales-over-time-container" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="col-span-full text-center py-5">
                        <i class="fas fa-spinner fa-spin text-2xl text-brand-red"></i>
                        <p class="mt-2 text-gray-500">Calculating sales...</p>
                    </div>
                </div>
            </div>

            <div id="revenue-by-order-type-panel" class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp" style="animation-delay: 200ms;">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Revenue by Order Type</h3>
                <div id="revenue-by-order-type-container" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="col-span-full text-center py-5">
                        <i class="fas fa-spinner fa-spin text-2xl text-brand-red"></i>
                        <p class="mt-2 text-gray-500">Calculating revenue...</p>
                    </div>
                </div>
            </div>

            <div id="customer-satisfaction-panel" class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp" style="animation-delay: 300ms;">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Customer Satisfaction</h3>
                <div id="customer-satisfaction-container" class="space-y-3">
                    <p class="text-center text-gray-500">Calculating average ratings...</p>
                </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp" style="animation-delay: 400ms;">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Most Popular Items</h3>
                <div id="popular-items-container" class="space-y-2">
                     <p class="text-center text-gray-500">Calculating...</p>
                </div>
            </div>
        </div>
    `;

    calculateAnalytics();
}
