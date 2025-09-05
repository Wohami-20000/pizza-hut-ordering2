// /js/panels/analytics.js

const db = firebase.database();
let charts = {}; // To hold chart instances

// --- UTILITY FUNCTIONS ---

/**
 * Destroys all existing Chart.js instances to prevent memory leaks.
 */
function destroyCharts() {
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
}

/**
 * Gets the ISO week number for a given date.
 * @param {Date} d - The date object.
 * @returns {number} The ISO week number.
 */
function getISOWeek(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

/**
 * Gets the week ID in YYYY-Www format.
 * @param {string|Date} dateInput - The date string or object.
 * @returns {string} The week ID.
 */
function getWeekId(dateInput) {
    const d = new Date(dateInput);
    const year = d.getUTCFullYear();
    const week = getISOWeek(d);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Gets all date strings (YYYY-MM-DD) for a given week ID.
 * @param {string} weekId - The week ID (e.g., "2025-W35").
 * @returns {string[]} An array of date strings.
 */
function getDatesOfWeek(weekId) {
    const [year, weekNum] = weekId.split('-W').map(Number);
    const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
    const days = (weekNum - 1) * 7;
    const startDate = new Date(firstDayOfYear.getTime() + days * 86400000);
    // Adjust to Monday of that week
    const dayOfWeek = startDate.getUTCDay();
    const diff = startDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(startDate.setUTCDate(diff));
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setUTCDate(monday.getUTCDate() + i);
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}


// --- DATA AGGREGATION (WEEKLY) ---

async function recalculateWeek() {
    const weekSelector = document.getElementById('weekly-report-selector');
    if (!weekSelector) return;
    const weekId = weekSelector.value;
    if (!weekId) {
        alert("Please select a week to recalculate.");
        return;
    }

    const recalcBtn = document.getElementById('recalc-week-btn');
    recalcBtn.disabled = true;
    recalcBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Recalculating...';

    try {
        const weekDates = getDatesOfWeek(weekId);
        const dailyPromises = weekDates.map(date => 
            db.ref(`/reports/daily/${date}`).once('value')
        );
        const dailySnapshots = await Promise.all(dailyPromises);

        const weeklyData = aggregateWeeklyData(dailySnapshots);
        await saveWeeklyReport(weekId, weeklyData);
        
        alert(`Weekly report for ${weekId} updated successfully!`);
        renderWeeklyReportContent(weeklyData); // Re-render with new data
    } catch (error) {
        console.error("Error recalculating week:", error);
        alert("Failed to recalculate weekly report.");
    } finally {
        recalcBtn.disabled = false;
        recalcBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Recalculate Week';
    }
}

function aggregateWeeklyData(dailySnapshots) {
    let salesTotal = 0, purchasesTotal = 0, profitTotal = 0, foodCostSum = 0, foodCostCount = 0;
    let salesBreakdown = { platform: 0, glovo: 0, regular: 0 };
    let ingredientLosses = {};

    dailySnapshots.forEach(snap => {
        if (!snap.exists()) return;
        const day = snap.val();
        const kpis = day.kpis || {};

        salesTotal += kpis.salesTotal || 0;
        profitTotal += kpis.profitEstimateActual || 0;
        if (kpis.foodCostActualPct) {
            foodCostSum += kpis.foodCostActualPct;
            foodCostCount++;
        }
        
        if (day.salesBreakdown) {
            salesBreakdown.platform += day.salesBreakdown.platform || 0;
            salesBreakdown.glovo += day.salesBreakdown.glovo || 0;
            salesBreakdown.regular += day.salesBreakdown.regular || 0;
        }

        // Aggregate purchases from stock counts
        if (day.stockCounts) {
            for (const ingId in day.stockCounts) {
                 purchasesTotal += day.stockCounts[ingId].purchases || 0;
            }
        }

        // Aggregate ingredient losses (variance value)
        if (kpis.varianceLoss > 0 && day.stockCounts) {
            for (const ingId in day.stockCounts) {
                const count = day.stockCounts[ingId];
                if (count.variance < 0) { // Loss
                     // This part needs ingredient cost, which isn't stored in kpis.
                     // For simplicity in this aggregation, we will sum the total variance loss from kpis
                     // and create a placeholder for top ingredients. A more detailed approach
                     // would require fetching ingredient costs.
                }
            }
        }
    });

    const topLossIngredients = { 'Example: Mozzarella': 400, 'Example: Pepperoni': 220 }; // Placeholder

    return {
        salesTotal,
        purchases: purchasesTotal,
        profit: profitTotal,
        foodCostAvg: foodCostCount ? foodCostSum / foodCostCount : 0,
        salesBreakdown,
        topLossIngredients,
    };
}

async function saveWeeklyReport(weekId, weeklyData) {
    return db.ref(`/reports/weekly/${weekId}`).set(weeklyData);
}

// --- UI RENDERING ---

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

async function loadAndRenderWeeklyTab() {
    const container = document.getElementById('weekly-report-content');
    if (!container) return;
    container.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`;

    const weeklyReportsSnap = await db.ref('reports/weekly').once('value');
    const weeklyReports = weeklyReportsSnap.val() || {};

    const weekIds = Object.keys(weeklyReports).sort().reverse();
    const weekOptions = weekIds.map(id => `<option value="${id}">${id}</option>`).join('');
    const currentWeekId = getWeekId(new Date());

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-4 mb-6 items-center">
            <select id="weekly-report-selector" class="w-full sm:w-auto p-2 border rounded-md bg-white">
                <option value="">Select a week</option>
                ${weekOptions}
            </select>
            <button id="recalc-week-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                <i class="fas fa-sync-alt mr-2"></i>Recalculate Week
            </button>
        </div>
        <div id="weekly-report-details">
            <p class="text-center text-gray-500">Please select a week to view its report.</p>
        </div>
    `;

    document.getElementById('weekly-report-selector').value = weekIds.includes(currentWeekId) ? currentWeekId : (weekIds[0] || '');
    if (document.getElementById('weekly-report-selector').value) {
        renderWeeklyReportContent(weeklyReports[document.getElementById('weekly-report-selector').value]);
    }
    
    document.getElementById('weekly-report-selector').addEventListener('change', (e) => {
        renderWeeklyReportContent(weeklyReports[e.target.value]);
    });
    
    document.getElementById('recalc-week-btn').addEventListener('click', recalculateWeek);
}

function renderWeeklyReportContent(data) {
    destroyCharts();
    const container = document.getElementById('weekly-report-details');
    if (!container || !data) {
        if(container) container.innerHTML = '<p class="text-center text-gray-500">No data available for the selected week.</p>';
        return;
    }

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            ${createStatCard('fa-dollar-sign', 'Total Sales', `${data.salesTotal.toFixed(2)} MAD`, 'green')}
            ${createStatCard('fa-shopping-cart', 'Total Purchases', `${data.purchases.toFixed(2)} MAD`, 'blue')}
            ${createStatCard('fa-chart-pie', 'Est. Profit', `${data.profit.toFixed(2)} MAD`, 'purple')}
            ${createStatCard('fa-percentage', 'Avg. Food Cost', `${data.foodCostAvg.toFixed(2)}%`, 'yellow')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6"><canvas id="weekly-sales-breakdown-chart"></canvas></div>
            <div class="bg-white rounded-xl shadow-lg p-6"><canvas id="weekly-top-losses-chart"></canvas></div>
        </div>
    `;

    // Pie Chart: Sales Breakdown
    charts.salesBreakdown = new Chart(document.getElementById('weekly-sales-breakdown-chart'), {
        type: 'pie',
        data: {
            labels: ['Platform', 'Glovo', 'In-House'],
            datasets: [{
                label: 'Sales Source',
                data: [data.salesBreakdown.platform, data.salesBreakdown.glovo, data.salesBreakdown.regular],
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B']
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' }, title: { display: true, text: 'Sales Breakdown by Source' } } }
    });

    // Bar Chart: Top Losses
    charts.topLosses = new Chart(document.getElementById('weekly-top-losses-chart'), {
        type: 'bar',
        data: {
            labels: Object.keys(data.topLossIngredients),
            datasets: [{
                label: 'Loss Value (MAD)',
                data: Object.values(data.topLossIngredients),
                backgroundColor: '#EF4444'
            }]
        },
        options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false }, title: { display: true, text: 'Top 5 Ingredient Losses' } } }
    });
}


/**
 * Main function to load the Analytics Panel with a tabbed interface.
 */
export function loadPanel(panelRoot, panelTitle) {
    destroyCharts(); // Ensure charts are cleared when switching panels
    panelTitle.textContent = 'Business Analytics';

    panelRoot.innerHTML = `
        <div class="bg-white rounded-xl shadow-lg p-2 sm:p-4">
            <div class="border-b">
                <nav class="flex space-x-2 -mb-px" id="analytics-tabs">
                     <button data-tab="weekly" class="analytics-tab-btn py-3 px-4 font-semibold border-b-2">Weekly</button>
                     <button data-tab="monthly" class="analytics-tab-btn py-3 px-4 font-semibold border-b-2">Monthly</button>
                     <button data-tab="yearly" class="analytics-tab-btn py-3 px-4 font-semibold border-b-2">Yearly</button>
                </nav>
            </div>
            <div class="pt-6">
                <div id="weekly-report" class="analytics-tab-content"></div>
                <div id="monthly-report" class="analytics-tab-content hidden"></div>
                <div id="yearly-report" class="analytics-tab-content hidden"></div>
            </div>
        </div>
    `;

    const tabs = panelRoot.querySelectorAll('.analytics-tab-btn');
    const contents = panelRoot.querySelectorAll('.analytics-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('border-red-500', 'text-red-600'));
            tab.classList.add('border-red-500', 'text-red-600');
            
            contents.forEach(c => c.classList.add('hidden'));
            const contentId = `${tab.dataset.tab}-report`;
            const activeContent = document.getElementById(contentId);
            if(activeContent) activeContent.classList.remove('hidden');

            // Load content for the active tab
            if (tab.dataset.tab === 'weekly') {
                loadAndRenderWeeklyTab();
            } else if (tab.dataset.tab === 'monthly') {
                document.getElementById('monthly-report').innerHTML = '<p class="text-center p-8 text-gray-500">Monthly reports coming soon.</p>';
            } else if (tab.dataset.tab === 'yearly') {
                document.getElementById('yearly-report').innerHTML = '<p class="text-center p-8 text-gray-500">Yearly reports coming soon.</p>';
            }
        });
    });

    // Trigger click on the first tab to load it initially
    tabs[0].click();
}
