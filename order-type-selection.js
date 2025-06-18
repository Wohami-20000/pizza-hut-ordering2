document.addEventListener('DOMContentLoaded', () => {
    const dineInOption = document.getElementById('dine-in-option');
    const pickupOption = document.getElementById('pickup-option');
    const deliveryOption = document.getElementById('delivery-option');

    const selectOrderType = (type) => {
        // Save the selected order type to localStorage
        localStorage.setItem('orderType', type);
        
        // Redirect the user to the menu page
        window.location.href = 'menu.html';
    };

    // Add click listeners to each option
    dineInOption.addEventListener('click', () => {
        selectOrderType(dineInOption.dataset.type);
    });

    pickupOption.addEventListener('click', () => {
        selectOrderType(pickupOption.dataset.type);
    });

    deliveryOption.addEventListener('click', () => {
        selectOrderType(deliveryOption.dataset.type);
    });
});