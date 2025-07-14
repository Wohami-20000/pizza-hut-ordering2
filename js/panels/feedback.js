// /js/panels/feedback.js

const db = firebase.database();

/**
 * Creates the HTML for a single feedback card.
 * @param {object} feedbackData - The feedback object from Firebase.
 * @param {string} [orderId] - The associated order ID, if any.
 * @returns {string} The HTML string for the feedback card.
 */
function createFeedbackCard(feedbackData, orderId = null) {
    const { userEmail, timestamp, ratings, comments } = feedbackData;
    const date = new Date(timestamp).toLocaleString();
    
    // Function to generate star icons based on a rating
    const renderStars = (rating) => {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star ${i <= rating ? 'text-yellow-400' : 'text-gray-300'}"></i>`;
        }
        return stars;
    };

    return `
        <div class="bg-white rounded-xl shadow-lg p-6 animate-fadeInUp">
            <div class="flex justify-between items-start border-b pb-3 mb-3">
                <div>
                    <p class="font-semibold text-gray-800">${userEmail}</p>
                    ${orderId ? `<a href="../order-details.html?orderId=${orderId}" target="_blank" class="text-sm text-blue-600 hover:underline">Order #${orderId}</a>` : '<p class="text-sm text-gray-500">General Feedback</p>'}
                </div>
                <p class="text-xs text-gray-500 text-right">${date}</p>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
                <div class="text-center">
                    <p class="text-sm font-medium text-gray-600">Food</p>
                    <div class="text-lg">${renderStars(ratings.food)}</div>
                </div>
                <div class="text-center">
                    <p class="text-sm font-medium text-gray-600">Delivery</p>
                    <div class="text-lg">${renderStars(ratings.delivery)}</div>
                </div>
                <div class="text-center">
                    <p class="text-sm font-medium text-gray-600">Overall</p>
                    <div class="text-lg">${renderStars(ratings.overall)}</div>
                </div>
            </div>

            ${comments ? `
                <div class="mt-4 pt-4 border-t">
                    <p class="text-gray-700 bg-gray-50 p-3 rounded-md">${comments}</p>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Fetches and combines general and order-specific feedback.
 */
async function loadAllFeedback() {
    const feedbackContainer = document.getElementById('feedback-container');
    if (!feedbackContainer) return;

    try {
        const generalFeedbackRef = db.ref('general_feedback');
        const ordersRef = db.ref('orders');

        const [generalSnapshot, ordersSnapshot] = await Promise.all([
            generalFeedbackRef.once('value'),
            ordersRef.orderByChild('feedback').once('value')
        ]);

        let allFeedback = [];

        // Process general feedback
        if (generalSnapshot.exists()) {
            const generalData = generalSnapshot.val();
            Object.values(generalData).forEach(feedback => {
                allFeedback.push({ ...feedback, type: 'general' });
            });
        }

        // Process order-specific feedback
        if (ordersSnapshot.exists()) {
            ordersSnapshot.forEach(orderSnap => {
                const orderData = orderSnap.val();
                if (orderData.feedback) {
                    allFeedback.push({ ...orderData.feedback, type: 'order', orderId: orderSnap.key });
                }
            });
        }
        
        // Sort all feedback by date, newest first
        allFeedback.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Render the feedback
        if (allFeedback.length > 0) {
            feedbackContainer.innerHTML = allFeedback.map(fb => createFeedbackCard(fb, fb.orderId)).join('');
        } else {
            feedbackContainer.innerHTML = '<p class="text-center text-gray-500 col-span-full">No customer feedback submitted yet.</p>';
        }

    } catch (error) {
        console.error("Error loading feedback:", error);
        feedbackContainer.innerHTML = '<p class="text-center text-red-500 col-span-full">Could not load feedback data.</p>';
    }
}

/**
 * Main function to load the Feedback Panel.
 */
export function loadPanel(panelRoot, panelTitle) {
    panelTitle.textContent = 'Customer Feedback';

    panelRoot.innerHTML = `
        <div class="space-y-6">
            <button onclick="history.back()" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-300 transition mb-4">
                <i class="fas fa-arrow-left mr-2"></i>Back
            </button>
            <div id="feedback-container" class="space-y-6">
                <div class="text-center py-20">
                    <i class="fas fa-spinner fa-spin text-4xl text-brand-red"></i>
                    <p class="mt-4 text-lg text-gray-600">Loading Feedback...</p>
                </div>
            </div>
        </div>
    `;

    loadAllFeedback();
}
