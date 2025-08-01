// order-type-selection.js
document.addEventListener('DOMContentLoaded', () => {
    const pickupOption = document.getElementById('pickup-option');
    const deliveryOption = document.getElementById('delivery-option');

    const selectOrderType = (type) => {
        // Save the selected order type to localStorage
        localStorage.setItem('orderType', type);

        // Clear any leftover table number from a previous session
        localStorage.removeItem('tableNumber');

        // Redirect the user to the menu page
        window.location.href = 'menu.html';
    };

    // Add click listeners to each of the remaining options
    if (pickupOption) {
        pickupOption.addEventListener('click', () => {
            selectOrderType(pickupOption.dataset.type);
        });
    }

    if (deliveryOption) {
        deliveryOption.addEventListener('click', () => {
            selectOrderType(deliveryOption.dataset.type);
        });
    }
});