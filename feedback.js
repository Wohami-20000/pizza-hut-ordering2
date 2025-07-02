document.addEventListener('DOMContentLoaded', () => {
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackContainer = document.getElementById('feedback-container');
    const successMessage = document.getElementById('success-message');
    const feedbackOrderId = document.getElementById('feedback-order-id');
    const starRatings = document.querySelectorAll('.star-rating');

    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');

    if (orderId) {
        feedbackOrderId.textContent = `For Order #${orderId.slice(-6).toUpperCase()}`;
    } else {
        feedbackContainer.innerHTML = '<p class="text-center text-red-500">No order specified. Please go back to "My Orders" and select an order to rate.</p>';
    }

    const ratingLabels = {
        0: "",
        1: "Poor",
        2: "Fair",
        3: "Good",
        4: "Very Good",
        5: "Excellent!"
    };

    starRatings.forEach(ratingGroup => {
        const category = ratingGroup.dataset.category;
        const stars = ratingGroup.querySelectorAll('.fa-star');
        const hiddenInput = document.getElementById(`${category}_rating`);
        const label = document.querySelector(`[data-category="${category}-label"]`);
        let currentRating = 0;

        const setActiveStars = (maxRating) => {
            stars.forEach(star => {
                star.classList.toggle('active', star.dataset.value <= maxRating);
            });
        };

        const setHoverStars = (maxRating) => {
             stars.forEach(star => {
                star.classList.toggle('hover', star.dataset.value <= maxRating);
            });
        }

        stars.forEach(star => {
            star.addEventListener('mouseover', () => {
                setHoverStars(star.dataset.value);
                if(label) label.textContent = ratingLabels[star.dataset.value];
            });
            star.addEventListener('mouseleave', () => {
                setHoverStars(0); // Clear hover effect
                 if(label) label.textContent = ratingLabels[currentRating];
            });
            star.addEventListener('click', () => {
                currentRating = star.dataset.value;
                hiddenInput.value = currentRating;
                setActiveStars(currentRating);
                 if(label) label.textContent = ratingLabels[currentRating];
            });
        });
    });

    feedbackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!orderId) {
            alert('No order specified for feedback.');
            return;
        }
        
        const foodRating = document.getElementById('food_rating').value;
        const deliveryRating = document.getElementById('delivery_rating').value;
        const overallRating = document.getElementById('overall_rating').value;
        const comments = document.getElementById('comments').value.trim();

        if (foodRating === '0' || deliveryRating === '0' || overallRating === '0') {
            alert('Please provide a rating for all categories.');
            return;
        }

        const feedbackData = {
            ratings: {
                food: parseInt(foodRating),
                delivery: parseInt(deliveryRating),
                overall: parseInt(overallRating)
            },
            comments: comments,
            timestamp: new Date().toISOString()
        };
        
        firebase.database().ref(`feedback/${orderId}`).set(feedbackData)
            .then(() => {
                // Also update the order itself to show it has been rated
                return firebase.database().ref(`orders/${orderId}/rated`).set(true);
            })
            .then(() => {
                feedbackContainer.style.opacity = '0';
                setTimeout(() => {
                    feedbackContainer.style.display = 'none';
                    successMessage.classList.remove('hidden');
                }, 500);
            })
            .catch(error => {
                console.error("Error submitting feedback:", error);
                alert("There was an error submitting your feedback. Please try again.");
            });
    });
});
