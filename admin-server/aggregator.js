/*
 * This script is a backend aggregator for generating analytics reports.
 * It should be run on a server or as a scheduled cloud function.
 *
 * What it does:
 * 1. Connects to Firebase using Admin credentials.
 * 2. Fetches all raw data from `/sales` and `/stockCounts`.
 * 3. Aggregates this data into weekly, monthly, and yearly summaries.
 * 4. Calculates key metrics for each period:
 * - Total Sales
 * - Total Ingredient Cost
 * - Total Variance/Loss Value
 * - Average Food Cost Percentage
 * 5. Saves these structured summaries to `/reports/weekly`, `/reports/monthly`, and `/reports/yearly`.
 *
 * This pre-computation makes the analytics tab in the admin dashboard load much faster,
 * as it only has to read the summarized data instead of processing everything on the client-side.
 */

const admin = require('firebase-admin');

// IMPORTANT: Replace with the path to your service account key file.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // IMPORTANT: Replace with your Realtime Database URL.
    databaseURL: 'https://pizzahut-clone-app-default-rtdb.firebaseio.com'
});

const db = admin.database();

async function runReportAggregator() {
    console.log('Starting report aggregation...');

    try {
        // 1. Fetch all necessary raw data in parallel
        const [salesSnapshot, stockCountsSnapshot, ingredientsSnapshot] = await Promise.all([
            db.ref('sales').once('value'),
            db.ref('stockCounts').once('value'),
            db.ref('ingredients').once('value')
        ]);

        const sales = salesSnapshot.val() || {};
        const stockCounts = stockCountsSnapshot.val() || {};
        const ingredients = ingredientsSnapshot.val() || {};

        if (Object.keys(sales).length === 0 || Object.keys(stockCounts).length === 0) {
            console.log('No sales or stock count data to process. Exiting.');
            return;
        }

        console.log(`Found data for ${Object.keys(sales).length} days.`);

        // --- Data Processing ---
        const reports = {
            weekly: {},
            monthly: {},
            yearly: {}
        };

        // Helper to initialize a report period
        const getNewReportPeriod = () => ({
            totalSales: 0,
            ingredientCost: 0,
            varianceLoss: 0,
            daysRecorded: 0,
            foodCostPercentage: 0
        });

        // Iterate through each day of sales data
        for (const date in sales) {
            const saleData = sales[date];
            const stockCountData = stockCounts[date] || {};

            // Calculate daily costs
            let dailyIngredientCost = 0;
            let dailyVarianceLoss = 0;

            for (const ingId in stockCountData) {
                const count = stockCountData[ingId];
                const ingredient = ingredients[ingId];
                if (ingredient) {
                    dailyIngredientCost += (count.used_expected || 0) * (ingredient.unit_cost || 0);
                    if (count.variance < 0) {
                        dailyVarianceLoss += Math.abs(count.variance) * (ingredient.unit_cost || 0);
                    }
                }
            }

            // --- Aggregate into periods ---
            const d = new Date(date);
            const year = d.getFullYear();
            const month = `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            
            // Get week number (e.g., 2023-W34)
            const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
            const week = `${weekStart.getFullYear()}-W${String(Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7)).padStart(2, '0')}`;

            // Initialize periods if they don't exist
            if (!reports.yearly[year]) reports.yearly[year] = getNewReportPeriod();
            if (!reports.monthly[month]) reports.monthly[month] = getNewReportPeriod();
            if (!reports.weekly[week]) reports.weekly[week] = getNewReportPeriod();

            // Add daily data to each period
            const periods = [reports.yearly[year], reports.monthly[month], reports.weekly[week]];
            periods.forEach(p => {
                p.totalSales += saleData.total || 0;
                p.ingredientCost += dailyIngredientCost;
                p.varianceLoss += dailyVarianceLoss;
                p.daysRecorded++;
            });
        }

        // --- Final Calculations (e.g., Food Cost %) ---
        for (const type in reports) {
            for (const periodKey in reports[type]) {
                const period = reports[type][periodKey];
                if (period.totalSales > 0) {
                    period.foodCostPercentage = (period.ingredientCost / period.totalSales) * 100;
                }
            }
        }

        // 4. Save aggregated reports back to Firebase
        await db.ref('reports').set(reports);

        console.log('Successfully aggregated and saved reports.');
        console.log(`- Weekly periods: ${Object.keys(reports.weekly).length}`);
        console.log(`- Monthly periods: ${Object.keys(reports.monthly).length}`);
        console.log(`- Yearly periods: ${Object.keys(reports.yearly).length}`);

    } catch (error) {
        console.error('Error running report aggregator:', error);
    } finally {
        // Close the database connection if the script is meant to exit
        db.app.delete();
    }
}

// Run the function
runReportAggregator();
