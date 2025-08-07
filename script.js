// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getDatabase, ref, onValue, push, set, get, child, update } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

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
const dbRef = ref(database);
const participantCardsContainer = document.getElementById('participant-cards');

// --- Main Render Function ---
function renderParticipants(data) {
    participantCardsContainer.innerHTML = '';
    let athonTotal = 0; // Renamed for clarity

    if (data.participants) {
        Object.entries(data.participants).forEach(([id, participant]) => {
            let totalRaisedByParticipant = 0;
            if (participant.sponsors) {
                Object.values(participant.sponsors).forEach(sponsor => {
                    const potentialDonation = sponsor.pledgePerKm * participant.distance;
                    if (sponsor.maxDonation && potentialDonation > sponsor.maxDonation) {
                        totalRaisedByParticipant += sponsor.maxDonation;
                    } else {
                        totalRaisedByParticipant += potentialDonation;
                    }
                });
            }
            athonTotal += totalRaisedByParticipant;

            const card = document.createElement('div');
            card.className = 'participant-card';
            card.innerHTML = `
                <div class="participant-photo-container">
                    ${participant.photoURL ? `<img src="${participant.photoURL}" alt="${participant.name}" class="participant-photo">` : ''}
                </div>
                <h3>${participant.name}</h3>
                <p><strong>Activity:</strong> ${participant.movementType || 'N/A'}</p>
                <p><strong>Current Distance:</strong> ${participant.distance} ${participant.unit}</p>
                <p><strong>Goal:</strong> ${participant.estimatedDistance} ${participant.unit}</p>
                <p><strong>Raised:</strong> $${totalRaisedByParticipant.toFixed(2)}</p>
                <div class="sponsor-list">
                    <strong>Sponsors:</strong>
                    ${participant.sponsors ? 
                        Object.values(participant.sponsors).map(sponsor => 
                            `<span>${sponsor.isAnonymous ? 'Anonymous' : sponsor.name}</span>`
                        ).join('') : 
                        '<span>None yet!</span>'
                    }
                </div>
                <div class="card-button-container">
                    <button class="card-button update-button" data-participant-id="${id}">Update Distance</button>
                    <button class="card-button" data-participant-id="${id}" data-participant-name="${participant.name}">Sponsor Me</button>
                </div>
            `;
            participantCardsContainer.appendChild(card);
        });
    }

    // --- NEW CALCULATION LOGIC ---

    // 1. Get the manually entered 'otherFunds' from your database
    const otherFunds = data.eventInfo.otherFunds || 0;

    // 2. Calculate the new overall total
    const overallTotal = athonTotal + otherFunds;

    // 3. Update all the cards in the summary section
    document.getElementById('total-raised').textContent = `$${athonTotal.toFixed(2)}`;
    document.getElementById('other-funds-total').textContent = `$${otherFunds.toFixed(2)}`;
    document.querySelector('header h1').textContent = data.eventInfo.eventName;
    document.getElementById('total-goal').textContent = `$${data.eventInfo.totalGoal.toFixed(2)}`;

    // --- Progress Bar Calculation ---
    const fundraisingGoal = data.eventInfo.totalGoal;
    // 4. Update the progress bar to use the new overall total
    const progressPercentage = (overallTotal / fundraisingGoal) * 100;

    const progressBarFill = document.getElementById('progress-bar-fill');
    const finalPercentage = Math.min(progressPercentage, 100);

    progressBarFill.style.width = `${finalPercentage}%`;
    progressBarFill.textContent = `${finalPercentage.toFixed(1)}%`;
}

// Listen for real-time changes to the database
onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        renderParticipants(data);
    }
});


// --- Get references to all modals and forms ---
const participantModal = document.getElementById('participant-modal');
const successModal = document.getElementById('success-modal');
const updateDistanceModal = document.getElementById('update-distance-modal');
const sponsorModal = document.getElementById('sponsor-modal');

const participantForm = document.getElementById('participant-form');
const updateDistanceForm = document.getElementById('update-distance-form');
const sponsorForm = document.getElementById('sponsor-form');


// --- Logic for the 'Become a Participant' Modal Form ---
const openParticipantBtn = document.getElementById('add-participant-btn');
const closeParticipantBtn = participantModal.querySelector('.close-btn');

openParticipantBtn.addEventListener('click', () => participantModal.style.display = 'block');
closeParticipantBtn.addEventListener('click', () => participantModal.style.display = 'none');

participantForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('participant-name').value;
    const email = document.getElementById('participant-email').value;
    const movementType = document.getElementById('movement-type').value;
    const estimatedDistance = parseInt(document.getElementById('est-distance').value);
    
    const trackerCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newParticipantData = {
        name, email, movementType, estimatedDistance, trackerCode,
        photoURL: "default.png",
        distance: 0,
        unit: "km"
    };

    const participantsRef = ref(database, 'participants');
    set(push(participantsRef), newParticipantData).then(() => {
        participantModal.style.display = 'none';
        participantForm.reset();
        document.getElementById('tracker-code-display').textContent = trackerCode;
        successModal.style.display = 'block';
    });
});

// --- Logic for the 'Success' Modal ---
const successCloseBtn = document.getElementById('success-close-btn');
successCloseBtn.addEventListener('click', () => successModal.style.display = 'none');


// --- Logic for the 'Update Distance' Modal ---
const updateDistanceCloseBtn = document.getElementById('update-distance-close-btn');
updateDistanceCloseBtn.addEventListener('click', () => updateDistanceModal.style.display = 'none');

updateDistanceForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const participantId = document.getElementById('update-participant-id').value;
    const trackerCodeInput = document.getElementById('tracker-code-input').value.toUpperCase();
    const newDistance = parseFloat(document.getElementById('new-distance').value);

    get(child(dbRef, `participants/${participantId}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const participantData = snapshot.val();
            if (participantData.trackerCode === trackerCodeInput) {
                const updates = {};
                updates[`/participants/${participantId}/distance`] = newDistance;
                update(dbRef, updates).then(() => {
                    alert('Distance updated successfully!');
                    updateDistanceModal.style.display = 'none';
                    updateDistanceForm.reset();
                });
            } else {
                alert('Invalid Tracker Code. Please try again.');
            }
        } else {
            alert('Participant not found.');
        }
    });
});

// --- Logic for the 'Sponsor Me' Modal ---
const sponsorCloseBtn = document.getElementById('sponsor-close-btn');
sponsorCloseBtn.addEventListener('click', () => sponsorModal.style.display = 'none');

sponsorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const selectedParticipantId = document.getElementById('sponsoring-participant-id').value;
    const sponsorName = document.getElementById('sponsor-name').value;
    const sponsorEmail = document.getElementById('sponsor-email').value;
    const pledgeAmount = parseFloat(document.getElementById('pledge-amount').value);
    const maxDonation = parseFloat(document.getElementById('max-donation').value) || null;
    const isAnonymous = document.getElementById('is-anonymous').checked;

    if (!selectedParticipantId || !sponsorName || !sponsorEmail || isNaN(pledgeAmount) || pledgeAmount <= 0) {
        alert("Please fill out all fields correctly.");
        return;
    }
    const newSponsorData = { name: sponsorName, email: sponsorEmail, pledgePerKm: pledgeAmount, maxDonation, isAnonymous };
    const participantSponsorsRef = ref(database, `participants/${selectedParticipantId}/sponsors`);
    set(push(participantSponsorsRef), newSponsorData).then(() => {
        sponsorModal.style.display = 'none';
        sponsorForm.reset();
    });
});

// --- Main Event Listener for clicks on cards ---
participantCardsContainer.addEventListener('click', (event) => {
    const button = event.target;
    if (button.classList.contains('card-button')) {
        const participantId = button.dataset.participantId;
        if (button.classList.contains('update-button')) {
            document.getElementById('update-participant-id').value = participantId;
            updateDistanceModal.style.display = 'block';
        } else {
            const participantName = button.dataset.participantName;
            document.getElementById('sponsoring-participant-id').value = participantId;
            document.getElementById('sponsoring-participant-name').textContent = `Sponsoring: ${participantName}`;
            sponsorModal.style.display = 'block';
        }
    }
});

// Generic close modal logic (clicking outside the box)
window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});