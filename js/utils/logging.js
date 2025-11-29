// /js/utils/logging.js
// Simple logging utility for admin actions on orders, users, etc.
// Logs to Firebase Realtime Database under "logs/".

(function () {
    if (typeof firebase === 'undefined') {
        console.warn('logging.js: firebase is not available. logAction will be a no-op.');
        window.logAction = function () {
            return Promise.resolve();
        };
        return;
    }

    const db = firebase.database();

    /**
     * Logs an admin action to Firebase for auditing.
     *
     * @param {'create'|'update'|'delete'|'info'|string} actionType - Type of action performed.
     * @param {string} targetLabel - Human-friendly label of what was changed (e.g., "Order #1234").
     * @param {string} targetId - ID of the target entity (e.g., orderId, userId).
     * @param {object} metadata - Extra info about the change.
     *   Example:
     *     { change: 'Assigned to driver John Doe (uid123)', actorUid: 'admin123' }
     */
    function logAction(actionType, targetLabel, targetId, metadata = {}) {
        try {
            const logRef = db.ref('logs').push();
            const payload = {
                actionType,
                targetLabel,
                targetId,
                metadata,
                timestamp: Date.now()
            };

            // If you track the current admin user, you can enrich the log here:
            // const currentUser = firebase.auth().currentUser;
            // if (currentUser) {
            //   payload.actorUid = currentUser.uid;
            //   payload.actorEmail = currentUser.email;
            // }

            return logRef.set(payload);
        } catch (err) {
            console.warn('logAction failed:', err);
            return Promise.resolve();
        }
    }

    // Expose globally
    window.logAction = logAction;
})();