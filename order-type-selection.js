document.addEventListener('DOMContentLoaded', () => {
    const pickupOption = document.getElementById('pickup-option');
    const deliveryOption = document.getElementById('delivery-option');

    // Function to apply translations
    const applyLanguage = () => {
        const lang = localStorage.getItem('lang') || 'en';
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(el => {
            const key = el.dataset.translate;
            if (translations[lang] && translations[lang][key]) {
                el.textContent = translations[lang][key];
            }
        });
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    };

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

    // Apply translations on page load
    applyLanguage();
});