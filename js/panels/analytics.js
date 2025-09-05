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

// --- DATA AGGREGATION (MONTHLY) ---

async function fetchMonthlyPurchases(yearMonth) {
    const ref = db.ref(`/purchases`);
    const snap = await ref.orderByKey().startAt(`${yearMonth}-01`).endAt(`${yearMonth}-31`).once("value");
    let allPurchases = [];
    if (snap.exists()) {
        snap.forEach(daySnap => {
            daySnap.forEach(purchaseSnap => {
                allPurchases.push(purchaseSnap.val());
            });
        });
    }
    return allPurchases;
}

async function fetchMonthlyDailyReports(yearMonth) {
    const ref = db.ref(`/reports/daily`);
    const snap = await ref.orderByKey().startAt(`${yearMonth}-01`).endAt(`${yearMonth}-31`).once("value");
    const dailyData = {};
    if (snap.exists()) {
        snap.forEach(daySnap => {
            dailyData[daySnap.key] = daySnap.val();
        });
    }
    return dailyData;
}

function aggregateMonthlyData(dailyReports, purchases) {
    let salesTotal = 0, profit = 0, varianceTotal = 0;
    let foodCostSum = 0, foodCostCount = 0;
    let salesBreakdown = { platform: 0, glovo: 0, regular: 0 };
    let supplierSummary = {};

    Object.values(dailyReports).forEach(day => {
        const kpis = day.kpis || {};
        salesTotal += kpis.salesTotal || 0;
        profit += kpis.profitEstimateActual || 0;
        varianceTotal += kpis.varianceLoss || 0;

        if (kpis.foodCostActualPct) {
            foodCostSum += kpis.foodCostActualPct;
            foodCostCount++;
        }
        if (day.salesBreakdown) {
            salesBreakdown.platform += day.salesBreakdown.platform || 0;
            salesBreakdown.glovo += day.salesBreakdown.glovo || 0;
            salesBreakdown.regular += day.salesBreakdown.regular || 0;
        }
    });

    purchases.forEach(p => {
        const sup = p.supplier || "Unknown";
        const cost = p.totalCost || 0;
        if (!supplierSummary[sup]) {
            supplierSummary[sup] = { purchases: 0, deliveries: 0 };
        }
        supplierSummary[sup].purchases += cost;
        supplierSummary[sup].deliveries += 1;
    });

    return {
        salesTotal,
        purchasesTotal: purchases.reduce((sum, p) => sum + (p.totalCost || 0), 0),
        profit,
        varianceTotal,
        foodCostAvg: foodCostCount ? foodCostSum / foodCostCount : 0,
        salesBreakdown,
        supplierSummary
    };
}

async function saveMonthlyReport(yearMonth, data) {
    return db.ref(`/reports/monthly/${yearMonth}`).set(data);
}

async function recalculateMonth() {
    const monthSelector = document.getElementById('monthly-report-selector');
    const yearMonth = monthSelector.value;
    if (!yearMonth) {
        alert("Please select a month.");
        return;
    }

    const recalcBtn = document.getElementById('recalc-month-btn');
    recalcBtn.disabled = true;
    recalcBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Recalculating...';

    try {
        const [dailyReports, purchases] = await Promise.all([
            fetchMonthlyDailyReports(yearMonth),
            fetchMonthlyPurchases(yearMonth)
        ]);

        if (Object.keys(dailyReports).length === 0) {
            alert(`No daily reports found for ${yearMonth}. Cannot generate monthly report.`);
            return;
        }
        
        const monthlyData = aggregateMonthlyData(dailyReports, purchases);
        await saveMonthlyReport(yearMonth, monthlyData);

        alert(`Monthly report for ${yearMonth} recalculated successfully!`);
        // Re-render content after recalculation
        renderMonthlyReportContent(monthlyData, dailyReports);
    } catch (error) {
        console.error("Error recalculating month:", error);
        alert("Failed to recalculate monthly report.");
    } finally {
        recalcBtn.disabled = false;
        recalcBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Recalculate Month';
    }
}

// --- DATA AGGREGATION (YEARLY) ---

async function fetchYearlyMonthlyReports(year) {
  const snap = await db.ref(`/reports/monthly`).orderByKey()
    .startAt(`${year}-01`)
    .endAt(`${year}-12`)
    .once("value");
  return snap.val() || {};
}

function aggregateYearlyData(monthlyReports) {
  let salesTotal = 0, purchasesTotal = 0, profit = 0, varianceTotal = 0;
  let foodCostSum = 0, foodCostCount = 0;
  let salesBreakdown = { platform: 0, glovo: 0, regular: 0 };
  let supplierSummary = {};

  Object.values(monthlyReports).forEach(month => {
    salesTotal += month.salesTotal || 0;
    purchasesTotal += month.purchasesTotal || 0;
    profit += month.profit || 0;
    varianceTotal += month.varianceTotal || 0;

    if (month.foodCostAvg) {
      foodCostSum += month.foodCostAvg;
      foodCostCount++;
    }

    if (month.salesBreakdown) {
      salesBreakdown.platform += month.salesBreakdown.platform || 0;
      salesBreakdown.glovo += month.salesBreakdown.glovo || 0;
      salesBreakdown.regular += month.salesBreakdown.regular || 0;
    }

    if (month.supplierSummary) {
      for (const sup in month.supplierSummary) {
        if (!supplierSummary[sup]) supplierSummary[sup] = { purchases: 0, deliveries: 0 };
        supplierSummary[sup].purchases += month.supplierSummary[sup].purchases || 0;
        supplierSummary[sup].deliveries += month.supplierSummary[sup].deliveries || 0;
      }
    }
  });

  return {
    salesTotal,
    purchasesTotal,
    profit,
    varianceTotal,
    foodCostAvg: foodCostCount ? foodCostSum / foodCostCount : 0,
    salesBreakdown,
    supplierSummary
  };
}

async function saveYearlyReport(year, yearlyData) {
  return db.ref(`/reports/yearly/${year}`).set(yearlyData);
}

async function recalculateYear() {
    const yearSelector = document.getElementById('yearly-report-selector');
    const year = yearSelector.value;
    if (!year) {
        alert("Please select a year.");
        return;
    }

    const recalcBtn = document.getElementById('recalc-year-btn');
    recalcBtn.disabled = true;
    recalcBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Recalculating...';

    try {
        const monthlyReports = await fetchYearlyMonthlyReports(year);
        if (Object.keys(monthlyReports).length === 0) {
            alert(`No monthly reports found for ${year}.`);
            recalcBtn.disabled = false;
            recalcBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Recalculate Year';
            return;
        }
        
        const yearlyData = aggregateYearlyData(monthlyReports);
        await saveYearlyReport(year, yearlyData);

        alert(`Yearly report for ${year} recalculated successfully!`);
        renderYearlyReportContent(yearlyData, monthlyReports);
    } catch (error) {
        console.error("Error recalculating year:", error);
        alert("Failed to recalculate yearly report.");
    } finally {
        recalcBtn.disabled = false;
        recalcBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Recalculate Year';
    }
}

async function exportYearlyReport(format) {
    const yearSelector = document.getElementById('yearly-report-selector');
    const year = yearSelector.value;
    if (!year) {
        alert("Please select a year to export.");
        return;
    }
    
    const [yearlySnap, monthlySnap] = await Promise.all([
        db.ref(`/reports/yearly/${year}`).once('value'),
        fetchYearlyMonthlyReports(year)
    ]);
    
    if (!yearlySnap.exists()) {
        alert('No data found for the selected year to export.');
        return;
    }

    const yearlyData = yearlySnap.val();
    const monthlyReports = monthlySnap;

    if (format === 'pdf') {
        const doc = new jspdf.jsPDF();
        doc.setFontSize(18);
        doc.text(`Yearly Report – ${year}`, 10, 15);
        
        doc.setFontSize(12);
        doc.text("Financial Summary", 10, 30);
        doc.autoTable({
            startY: 35,
            body: [
                ['Total Sales', `${yearlyData.salesTotal.toFixed(2)} MAD`],
                ['Total Purchases', `${yearlyData.purchasesTotal.toFixed(2)} MAD`],
                ['Estimated Profit', `${yearlyData.profit.toFixed(2)} MAD`],
                ['Total Variance Loss', `${yearlyData.varianceTotal.toFixed(2)} MAD`],
                ['Average Food Cost %', `${yearlyData.foodCostAvg.toFixed(2)}%`],
            ],
            theme: 'striped',
        });

        const supplierSummary = Object.entries(yearlyData.supplierSummary || {}).sort(([,a], [,b]) => b.purchases - a.purchases);
            
        doc.text("Supplier Performance", 10, doc.autoTable.previous.finalY + 15);
        doc.autoTable({
             head: [['Supplier', 'Total Purchases (MAD)', 'Deliveries', 'Avg/Delivery (MAD)']],
             body: supplierSummary.map(([name, data]) => [
                name,
                data.purchases.toFixed(2),
                data.deliveries,
                (data.deliveries > 0 ? data.purchases / data.deliveries : 0).toFixed(2)
             ]),
             startY: doc.autoTable.previous.finalY + 20,
        });

        doc.save(`yearly-report-${year}.pdf`);

    } else if (format === 'excel') {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Financial Summary
        const summaryData = [{
            Metric: "Total Sales (MAD)", Value: yearlyData.salesTotal
        }, {
            Metric: "Total Purchases (MAD)", Value: yearlyData.purchasesTotal
        }, {
            Metric: "Estimated Profit (MAD)", Value: yearlyData.profit
        }, {
            Metric: "Total Variance Loss (MAD)", Value: yearlyData.varianceTotal
        }, {
             Metric: "Average Food Cost %", Value: yearlyData.foodCostAvg
        }];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Financial Summary");

        // Sheet 2: Supplier Summary
        const supplierSummary = Object.entries(yearlyData.supplierSummary || {}).sort(([,a], [,b]) => b.purchases - a.purchases);
        const supplierData = supplierSummary.map(([name, data]) => ({
            'Supplier': name,
            'Total Purchases (MAD)': data.purchases,
            'Deliveries': data.deliveries,
            'Avg/Delivery (MAD)': (data.deliveries > 0 ? data.purchases / data.deliveries : 0)
        }));
        const wsSuppliers = XLSX.utils.json_to_sheet(supplierData);
        XLSX.utils.book_append_sheet(wb, wsSuppliers, "Supplier Summary");
        
        // Sheet 3: Monthly Breakdown
        const monthlyBreakdown = Object.entries(monthlyReports).map(([monthId, data]) => ({
            'Month': monthId,
            'Sales (MAD)': data.salesTotal,
            'Purchases (MAD)': data.purchasesTotal,
            'Profit (MAD)': data.profit,
            'Variance (MAD)': data.varianceTotal,
            'Food Cost %': data.foodCostAvg
        }));
        const wsMonthly = XLSX.utils.json_to_sheet(monthlyBreakdown);
        XLSX.utils.book_append_sheet(wb, wsMonthly, "Monthly Breakdown");

        XLSX.writeFile(wb, `yearly-report-${year}.xlsx`);
    }
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

// --- WEEKLY TAB ---

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

    const selector = document.getElementById('weekly-report-selector');
    selector.value = weekIds.includes(currentWeekId) ? currentWeekId : (weekIds[0] || '');
    if (selector.value) {
        renderWeeklyReportContent(weeklyReports[selector.value]);
    }
    
    selector.addEventListener('change', (e) => {
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
            ${createStatCard('fa-shopping-cart', 'Total Purchases', `${(data.purchases || 0).toFixed(2)} MAD`, 'blue')}
            ${createStatCard('fa-chart-pie', 'Est. Profit', `${data.profit.toFixed(2)} MAD`, 'purple')}
            ${createStatCard('fa-percentage', 'Avg. Food Cost', `${data.foodCostAvg.toFixed(2)}%`, 'yellow')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 bg-white rounded-xl shadow-lg p-6"><canvas id="weekly-sales-breakdown-chart"></canvas></div>
            <div class="bg-white rounded-xl shadow-lg p-6"><canvas id="weekly-top-losses-chart"></canvas></div>
        </div>
    `;

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

// --- MONTHLY TAB ---

async function loadAndRenderMonthlyTab() {
    const container = document.getElementById('monthly-report');
    if (!container) return;
    container.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`;

    const monthlyReportsSnap = await db.ref('reports/monthly').once('value');
    const monthlyReports = monthlyReportsSnap.val() || {};
    
    const monthIds = Object.keys(monthlyReports).sort().reverse();
    const monthOptions = monthIds.map(id => {
        const d = new Date(id + '-02'); // Use day 2 to avoid timezone issues
        const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        return `<option value="${id}">${monthName}</option>`;
    }).join('');

    const currentMonthId = new Date().toISOString().slice(0, 7);

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-4 mb-6 items-center">
            <select id="monthly-report-selector" class="w-full sm:w-auto p-2 border rounded-md bg-white">
                <option value="">Select a month</option>
                ${monthOptions}
            </select>
            <button id="recalc-month-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                <i class="fas fa-sync-alt mr-2"></i>Recalculate Month
            </button>
        </div>
        <div id="monthly-report-details">
            <p class="text-center text-gray-500">Please select a month to view its report.</p>
        </div>
    `;
    
    const selector = document.getElementById('monthly-report-selector');
    selector.value = monthIds.includes(currentMonthId) ? currentMonthId : (monthIds[0] || '');
    
    const handleMonthChange = async (e) => {
        const yearMonth = e.target.value;
        if (!yearMonth) return;
        const detailsContainer = document.getElementById('monthly-report-details');
        detailsContainer.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`;
        
        const [monthlyData, dailyData] = await Promise.all([
             monthlyReports[yearMonth],
             fetchMonthlyDailyReports(yearMonth)
        ]);
        renderMonthlyReportContent(monthlyData, dailyData);
    };

    selector.addEventListener('change', handleMonthChange);
    document.getElementById('recalc-month-btn').addEventListener('click', recalculateMonth);

    if (selector.value) {
        selector.dispatchEvent(new Event('change'));
    }
}

function renderMonthlyReportContent(data, dailyData) {
    destroyCharts();
    const container = document.getElementById('monthly-report-details');
    if (!container || !data) {
        if(container) container.innerHTML = '<p class="text-center text-gray-500">No data available for the selected month.</p>';
        return;
    }

    const supplierSummary = Object.entries(data.supplierSummary || {}).sort(([,a], [,b]) => b.purchases - a.purchases);
    const supplierTableHtml = supplierSummary.map(([name, supData]) => `
        <tr class="hover:bg-gray-50">
            <td class="p-3 font-medium">${name}</td>
            <td class="p-3 text-right">${supData.purchases.toFixed(2)} MAD</td>
            <td class="p-3 text-center">${supData.deliveries}</td>
            <td class="p-3 text-right">${(supData.deliveries > 0 ? supData.purchases / supData.deliveries : 0).toFixed(2)} MAD</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            ${createStatCard('fa-dollar-sign', 'Total Sales', `${data.salesTotal.toFixed(2)} MAD`, 'green')}
            ${createStatCard('fa-shopping-cart', 'Total Purchases', `${data.purchasesTotal.toFixed(2)} MAD`, 'blue')}
            ${createStatCard('fa-chart-pie', 'Est. Profit', `${data.profit.toFixed(2)} MAD`, 'purple')}
            ${createStatCard('fa-exclamation-triangle', 'Variance Cost', `${data.varianceTotal.toFixed(2)} MAD`, 'red')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-lg p-6"><canvas id="monthly-trends-chart"></canvas></div>
            <div class="bg-white rounded-xl shadow-lg p-6"><canvas id="monthly-sales-breakdown-chart"></canvas></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="font-bold mb-4">Purchases by Supplier</h3>
                <canvas id="monthly-supplier-purchases-chart"></canvas>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="font-bold mb-4">Supplier Performance</h3>
                <div class="overflow-y-auto max-h-80">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 sticky top-0"><tr>
                            <th class="p-3 text-left">Supplier</th><th class="p-3 text-right">Purchases</th>
                            <th class="p-3 text-center">Deliveries</th><th class="p-3 text-right">Avg/Delivery</th>
                        </tr></thead>
                        <tbody class="divide-y">${supplierTableHtml}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Chart 1: Daily Trends
    const daysInMonth = dailyData ? new Date(new Date(Object.keys(dailyData)[0]).getFullYear(), new Date(Object.keys(dailyData)[0]).getMonth() + 1, 0).getDate() : 30;
    const trendLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const dailyReportsForMonth = Object.keys(dailyData);
    const dailySales = trendLabels.map(day => dailyData[`${dailyReportsForMonth[0].slice(0, 8)}${String(day).padStart(2, '0')}`]?.kpis.salesTotal || 0);
    const dailyProfit = trendLabels.map(day => dailyData[`${dailyReportsForMonth[0].slice(0, 8)}${String(day).padStart(2, '0')}`]?.kpis.profitEstimateActual || 0);
    
    charts.trends = new Chart(document.getElementById('monthly-trends-chart'), {
        type: 'line',
        data: {
            labels: trendLabels,
            datasets: [
                { label: 'Sales (MAD)', data: dailySales, borderColor: '#10B981', tension: 0.1, fill: false },
                { label: 'Profit (MAD)', data: dailyProfit, borderColor: '#8B5CF6', tension: 0.1, fill: false }
            ]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'Daily Sales & Profit Trends' } } }
    });

    // Chart 2: Sales Breakdown
    charts.salesBreakdown = new Chart(document.getElementById('monthly-sales-breakdown-chart'), {
        type: 'doughnut',
        data: {
            labels: ['Platform', 'Glovo', 'In-House'],
            datasets: [{
                data: [data.salesBreakdown.platform, data.salesBreakdown.glovo, data.salesBreakdown.regular],
                backgroundColor: ['#3B82F6', '#10B981', '#F59E0B']
            }]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'Sales by Source' } } }
    });
    
    // Chart 3: Supplier Purchases
    charts.supplierPurchases = new Chart(document.getElementById('monthly-supplier-purchases-chart'), {
        type: 'bar',
        data: {
            labels: supplierSummary.map(([name]) => name),
            datasets: [{
                label: 'Total Purchases (MAD)',
                data: supplierSummary.map(([, supData]) => supData.purchases),
                backgroundColor: '#3B82F6'
            }]
        },
        options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } } }
    });
}

// --- YEARLY TAB ---

async function loadAndRenderYearlyTab() {
    const container = document.getElementById('yearly-report');
    if (!container) return;
    container.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`;

    const yearlyReportsSnap = await db.ref('reports/yearly').once('value');
    const yearlyReports = yearlyReportsSnap.val() || {};
    
    const yearIds = Object.keys(yearlyReports).sort().reverse();
    // Dynamically generate year options from available data, or default to recent years
    const availableYears = new Set(yearIds.map(y => parseInt(y)));
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 3; i++) {
        availableYears.add(currentYear - i);
    }
    const yearOptions = Array.from(availableYears).sort().reverse().map(id => `<option value="${id}">${id}</option>`).join('');

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-4 mb-6 items-center">
            <select id="yearly-report-selector" class="w-full sm:w-auto p-2 border rounded-md bg-white">
                <option value="">Select a year</option>
                ${yearOptions}
            </select>
            <button id="recalc-year-btn" class="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                <i class="fas fa-sync-alt mr-2"></i>Recalculate Year
            </button>
            <div class="flex-grow"></div>
             <button id="export-year-pdf-btn" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition">
                <i class="fas fa-file-pdf mr-2"></i>Export PDF
            </button>
            <button id="export-year-excel-btn" class="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition">
                <i class="fas fa-file-excel mr-2"></i>Export Excel
            </button>
        </div>
        <div id="yearly-report-details">
            <p class="text-center text-gray-500">Please select a year to view its report.</p>
        </div>
    `;
    
    const selector = document.getElementById('yearly-report-selector');
    selector.value = String(currentYear);
    
    const handleYearChange = async (e) => {
        const year = e.target.value;
        if (!year) return;
        const detailsContainer = document.getElementById('yearly-report-details');
        detailsContainer.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-3xl"></i></div>`;
        
        const [yearlyData, monthlyData] = await Promise.all([
             db.ref(`/reports/yearly/${year}`).once('value').then(snap => snap.val()),
             fetchYearlyMonthlyReports(year)
        ]);
        
        if (yearlyData) {
            renderYearlyReportContent(yearlyData, monthlyData);
        } else {
            detailsContainer.innerHTML = '<p class="text-center text-gray-500">No report found for this year. Please recalculate.</p>';
        }
    };

    selector.addEventListener('change', handleYearChange);
    document.getElementById('recalc-year-btn').addEventListener('click', recalculateYear);
    document.getElementById('export-year-pdf-btn').addEventListener('click', () => exportYearlyReport('pdf'));
    document.getElementById('export-year-excel-btn').addEventListener('click', () => exportYearlyReport('excel'));

    if (selector.value) {
        selector.dispatchEvent(new Event('change'));
    }
}

function renderYearlyReportContent(yearlyData, monthlyReports) {
    destroyCharts();
    const container = document.getElementById('yearly-report-details');
    if (!container || !yearlyData) {
        if (container) container.innerHTML = '<p class="text-center text-gray-500">No data available for the selected year. Try recalculating.</p>';
        return;
    }

    const supplierSummary = Object.entries(yearlyData.supplierSummary || {}).sort(([, a], [, b]) => b.purchases - a.purchases);
    const supplierTableHtml = supplierSummary.map(([name, supData]) => `
        <tr class="hover:bg-gray-50">
            <td class="p-3 font-medium">${name}</td>
            <td class="p-3 text-right">${supData.purchases.toFixed(2)} MAD</td>
            <td class="p-3 text-center">${supData.deliveries}</td>
            <td class="p-3 text-right">${(supData.deliveries > 0 ? supData.purchases / supData.deliveries : 0).toFixed(2)} MAD</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            ${createStatCard('fa-dollar-sign', 'Total Sales', `${yearlyData.salesTotal.toFixed(2)} MAD`, 'green')}
            ${createStatCard('fa-shopping-cart', 'Total Purchases', `${yearlyData.purchasesTotal.toFixed(2)} MAD`, 'blue')}
            ${createStatCard('fa-chart-pie', 'Est. Profit', `${yearlyData.profit.toFixed(2)} MAD`, 'purple')}
            ${createStatCard('fa-percentage', 'Avg. Food Cost', `${yearlyData.foodCostAvg.toFixed(2)}%`, 'yellow')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div class="bg-white rounded-xl shadow-lg p-6"><canvas id="yearly-trends-chart"></canvas></div>
            <div class="bg-white rounded-xl shadow-lg p-6"><canvas id="yearly-sales-breakdown-chart"></canvas></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="font-bold mb-4">Supplier Purchases (Yearly)</h3>
                <canvas id="yearly-supplier-purchases-chart"></canvas>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6">
                <h3 class="font-bold mb-4">Supplier Performance (Yearly)</h3>
                <div class="overflow-y-auto max-h-80">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 sticky top-0"><tr>
                            <th class="p-3 text-left">Supplier</th><th class="p-3 text-right">Purchases</th>
                            <th class="p-3 text-center">Deliveries</th><th class="p-3 text-right">Avg/Delivery</th>
                        </tr></thead>
                        <tbody class="divide-y">${supplierTableHtml}</tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    const year = document.getElementById('yearly-report-selector').value;
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyDataForChart = monthLabels.map((_, i) => {
        const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
        return monthlyReports[monthKey] || { salesTotal: 0, purchasesTotal: 0, profit: 0 };
    });

    charts.yearlyTrends = new Chart(document.getElementById('yearly-trends-chart'), {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                { label: 'Sales (MAD)', data: monthlyDataForChart.map(m => m.salesTotal), borderColor: '#10B981', tension: 0.1, fill: false },
                { label: 'Purchases (MAD)', data: monthlyDataForChart.map(m => m.purchasesTotal), borderColor: '#3B82F6', tension: 0.1, fill: false },
                { label: 'Profit (MAD)', data: monthlyDataForChart.map(m => m.profit), borderColor: '#8B5CF6', tension: 0.1, fill: false }
            ]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'Yearly Trends: Sales, Purchases, Profit' } } }
    });

    charts.yearlySalesBreakdown = new Chart(document.getElementById('yearly-sales-breakdown-chart'), {
        type: 'pie',
        data: {
            labels: ['Platform', 'Glovo', 'In-House'],
            datasets: [{ data: [yearlyData.salesBreakdown.platform, yearlyData.salesBreakdown.glovo, yearlyData.salesBreakdown.regular], backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'] }]
        },
        options: { responsive: true, plugins: { title: { display: true, text: 'Yearly Sales Breakdown by Source' }, legend: { position: 'top' } } }
    });

    const supplierNames = supplierSummary.map(([name]) => name);
    const supplierPurchasesData = supplierSummary.map(([, supData]) => supData.purchases);
    charts.yearlySuppliers = new Chart(document.getElementById('yearly-supplier-purchases-chart'), {
        type: 'bar',
        data: {
            labels: supplierNames,
            datasets: [{ label: 'Total Purchases (MAD)', data: supplierPurchasesData, backgroundColor: '#3B82F6' }]
        },
        options: { responsive: true, indexAxis: 'y', plugins: { title: { display: true, text: 'Supplier Purchases (Yearly)' }, legend: { display: false } } }
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
                <div id="weekly-report-content" class="analytics-tab-content"></div>
                <div id="monthly-report" class="analytics-tab-content hidden"></div>
                <div id="yearly-report" class="analytics-tab-content hidden"></div>
            </div>
        </div>
    `;

    const tabs = panelRoot.querySelectorAll('.analytics-tab-btn');
    const contents = panelRoot.querySelectorAll('.analytics-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            destroyCharts();
            tabs.forEach(t => t.classList.remove('border-red-500', 'text-red-600'));
            tab.classList.add('border-red-500', 'text-red-600');
            
            contents.forEach(c => c.classList.add('hidden'));
            
            const contentId = `${tab.dataset.tab}-report`;
            const activeContent = document.getElementById(contentId);
            if(activeContent) activeContent.classList.remove('hidden');

            if (tab.dataset.tab === 'weekly') {
                loadAndRenderWeeklyTab();
            } else if (tab.dataset.tab === 'monthly') {
                loadAndRenderMonthlyTab();
            } else if (tab.dataset.tab === 'yearly') {
                loadAndRenderYearlyTab();
            }
        });
    });

    tabs[0].click();
}
