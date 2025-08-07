// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjKqi-hxcs2BghFl5GHssNxTQ9MipSpY4",
    authDomain: "bethanysfundraiser.firebaseapp.com",
    databaseURL: "https://bethanysfundraiser-default-rtdb.firebaseio.com",
    projectId: "bethanysfundraiser",
    storageBucket: "bethanysfundraiser.firebasestorage.app",
    messagingSenderId: "862479860790",
    appId: "1:862479860790:web:22b886c966a9e2e4cbc497"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const eventRef = ref(database, '/');
// ✅ MOVED HERE: This variable is now globally accessible
const participantCardsContainer = document.getElementById('participant-cards');

// --- Main Render Function ---
function renderParticipants(data) {
    // This function can now see the global 'participantCardsContainer'
    participantCardsContainer.innerHTML = '';
    let totalRaised = 0;

    if (data.participants) {
        Object.entries(data.participants).forEach(([id, participant]) => {
            let pledgeTotal = 0;
            if (participant.sponsors) {
                Object.values(participant.sponsors).forEach(sponsor => {
                    pledgeTotal += sponsor.pledgePerKm;
                });
            }
            const raisedAmount = pledgeTotal * participant.distance;
            totalRaised += raisedAmount;

            const card = document.createElement('div');
            card.className = 'participant-card';
            card.innerHTML = `
                <h3>${participant.name}</h3>
                <p><strong>Distance:</strong> ${participant.distance} ${participant.unit}</p>
                <p><strong>Raised:</strong> $${raisedAmount.toFixed(2)}</p>
                <p><strong>Sponsors:</strong> ${participant.sponsors ? Object.keys(participant.sponsors).length : 0}</p>
                <button class="card-button" data-participant-id="${id}" data-participant-name="${participant.name}">Sponsor Me</button>
            `;
            participantCardsContainer.appendChild(card);
        });
    }

    document.getElementById('total-raised').textContent = `$${totalRaised.toFixed(2)}`;
    document.querySelector('header h1').textContent = data.eventInfo.eventName;
    document.getElementById('total-goal').textContent = `$${data.eventInfo.totalGoal.toFixed(2)}`;
}

// Listen for real-time changes to the database
onValue(eventRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        renderParticipants(data);
    }
});


// --- Logic for the 'Become a Participant' Modal Form ---
const participantModal = document.getElementById('participant-modal');
const openParticipantBtn = document.getElementById('add-participant-btn');
const closeParticipantBtn = participantModal.querySelector('.close-btn');
const participantForm = document.getElementById('participant-form');

openParticipantBtn.addEventListener('click', () => participantModal.style.display = 'block');
closeParticipantBtn.addEventListener('click', () => participantModal.style.display = 'none');
participantForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('participant-name').value;
    const email = document.getElementById('participant-email').value;
    if (!name || !email) {
        alert("Please fill out both fields.");
        return;
    }
    const newParticipantData = {
        name: name, email: email, distance: 0, unit: "km"
    };
    const participantsRef = ref(database, 'participants');
    set(push(participantsRef), newParticipantData).then(() => {
        participantModal.style.display = 'none';
        participantForm.reset();
    });
});


// --- Logic for the 'Become a Sponsor' Modal Form ---
const sponsorModal = document.getElementById('sponsor-modal');
const sponsorCloseBtn = document.getElementById('sponsor-close-btn');
const sponsorForm = document.getElementById('sponsor-form');

sponsorCloseBtn.addEventListener('click', () => sponsorModal.style.display = 'none');
// ✅ THIS WILL NOW WORK: This event listener can see the global 'participantCardsContainer'
participantCardsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('card-button')) {
        const button = event.target;
        const participantId = button.dataset.participantId;
        const participantName = button.dataset.participantName;
        document.getElementById('sponsoring-participant-id').value = participantId;
        document.getElementById('sponsoring-participant-name').textContent = `Sponsoring: ${participantName}`;
        sponsorModal.style.display = 'block';
    }
});
sponsorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const selectedParticipantId = document.getElementById('sponsoring-participant-id').value;
    const sponsorName = document.getElementById('sponsor-name').value;
    const sponsorEmail = document.getElementById('sponsor-email').value;
    const pledgeAmount = parseFloat(document.getElementById('pledge-amount').value);
    if (!selectedParticipantId || !sponsorName || isNaN(pledgeAmount) || pledgeAmount <= 0) {
        alert("Please fill out all fields correctly.");
        return;
    }
    const newSponsorData = { name: sponsorName, email: sponsorEmail, pledgePerKm: pledgeAmount };
    const participantSponsorsRef = ref(database, `participants/${selectedParticipantId}/sponsors`);
    set(push(participantSponsorsRef), newSponsorData).then(() => {
        sponsorModal.style.display = 'none';
        sponsorForm.reset();
    });
});


// Generic close modal logic (clicking outside the box)
window.addEventListener('click', (event) => {
    if (event.target == participantModal) {
        participantModal.style.display = 'none';
        participantForm.reset();
    }
    if (event.target == sponsorModal) {
        sponsorModal.style.display = 'none';
        sponsorForm.reset();
    }
});