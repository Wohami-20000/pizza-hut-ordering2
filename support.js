document.addEventListener('DOMContentLoaded', () => {
    const supportForm = document.getElementById('support-form');
    const supportCard = document.getElementById('support-card');
    const successMessage = document.getElementById('success-message');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');

    const auth = firebase.auth();
    const db = firebase.database();

    // Initialize EmailJS
    (function(){
        emailjs.init({
            publicKey: "kQudxogsoBTYAfXIR",
        });
    })();

    // Check for logged in user and pre-fill form
    auth.onAuthStateChanged(user => {
        if (user && !user.isAnonymous) {
            // User is logged in, fetch their profile
            db.ref('users/' + user.uid).once('value').then(snapshot => {
                const userProfile = snapshot.val();
                if (userProfile) {
                    nameInput.value = userProfile.name || '';
                    emailInput.value = userProfile.email || user.email;
                } else {
                    // Fallback to auth email if profile is empty
                    emailInput.value = user.email;
                }
            });
        }
    });

    // Handle form submission
    supportForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const serviceID = 'service_kpjtcc5';
        const templateID = 'template_x2t6vab';

        // Show loading state on button
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Sending...';
        submitButton.disabled = true;


        emailjs.sendForm(serviceID, templateID, this)
            .then(() => {
                supportCard.style.display = 'none';
                successMessage.classList.remove('hidden');
            }, (err) => {
                alert('An error occurred while sending the message. Please try again later.');
                console.error('EmailJS Error:', err);
                // Restore button on error
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            });
    });
});