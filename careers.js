/*=============== DARK/LIGHT THEME TOGGLE ===============*/
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const themeIcon = themeToggle.querySelector('i');

const applySavedTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeIcon.classList.remove('ri-moon-line');
        themeIcon.classList.add('ri-sun-line');
    } else {
        body.classList.remove('dark-mode');
        themeIcon.classList.remove('ri-sun-line');
        themeIcon.classList.add('ri-moon-line');
    }
};

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeIcon.classList.remove('ri-moon-line');
        themeIcon.classList.add('ri-sun-line');
    } else {
        localStorage.setItem('theme', 'light');
        themeIcon.classList.remove('ri-sun-line');
        themeIcon.classList.add('ri-moon-line');
    }
});

applySavedTheme();

/*=============== SHOW SCROLL UP ===============*/
const scrollUp = document.getElementById('scroll-up');
if (scrollUp) {
    window.addEventListener('scroll', () => {
        if (window.scrollY >= 400) {
            scrollUp.classList.add('show-scroll');
        } else {
            scrollUp.classList.remove('show-scroll');
        }
    });
}


/*=============== ALL CAREERS PAGE LOGIC ===============*/
document.addEventListener('DOMContentLoaded', () => {
    // --- Get all the elements we need ---
    const careerGrid = document.getElementById('all-careers-grid');
    const requestContainer = document.getElementById('request-container');
    const careerNameInput = document.getElementById('career-name-input');
    
    // Get Modals and their components
    const viewCareerModal = document.getElementById('career-modal');
    const viewCareerCloseBtn = viewCareerModal.querySelector('.modal__close');
    const addCareerModal = document.getElementById('add-career-modal');
    const addCareerCloseBtn = addCareerModal.querySelector('.modal__close');
    const addCareerForm = document.getElementById('add-career-form');
    const successMessage = document.getElementById('submission-success');

    // --- NEW: Get a reference to the Firestore database ---
    const db = firebase.firestore();
    let allCareerData = [];

    // --- Main function to fetch and process data ---
    fetch('careers.json')
        .then(response => response.json())
        .then(data => {
            allCareerData = data;
            const searchQuery = new URLSearchParams(window.location.search).get('search');
            let careersToDisplay = allCareerData;

            if (searchQuery) {
                careersToDisplay = allCareerData.filter(career => 
                    career.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    career.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    career.skills.join(' ').toLowerCase().includes(searchQuery.toLowerCase())
                );
            }
            displayContent(careersToDisplay, searchQuery);
            setupEventListeners();
            loadSavedCareers(); // Load user's saved careers after displaying them
        })
        .catch(error => console.error('Error fetching career data:', error));

    // --- This function decides what to show on the page ---
    function displayContent(careers, searchQuery) {
        careerGrid.innerHTML = ''; 

        if (careers.length > 0 || !searchQuery) {
            requestContainer.style.display = 'none';
            careerGrid.style.display = 'grid';

            careers.forEach(career => {
                const card = document.createElement('div');
                card.className = 'career-card';
                card.dataset.careerId = career.id;
                // UPDATED: Added the save button to the card's HTML
                card.innerHTML = `
                    <button class="save-btn" aria-label="Save career">
                        <i class="ri-bookmark-line"></i>
                    </button>
                    <h3>${career.title}</h3>
                    <p>${career.description.substring(0, 100)}...</p>
                `;
                // Add listener for the VIEW modal
                card.addEventListener('click', () => openViewModal(career.id));
                
                // NEW: Add listener for the SAVE button
                const saveBtn = card.querySelector('.save-btn');
                saveBtn.addEventListener('click', (event) => {
                    event.stopPropagation(); // Prevent the card's click event from firing
                    toggleSaveCareer(career.id, saveBtn);
                });
                
                careerGrid.appendChild(card);
            });
        } else if (searchQuery) {
            careerGrid.style.display = 'none';
            requestContainer.style.display = 'block';
            careerNameInput.value = searchQuery;
        }

        const addCard = document.createElement('div');
        addCard.className = 'add-career-card';
        addCard.innerHTML = `<i class="ri-add-line"></i><h3>Suggest a Career</h3>`;
        addCard.addEventListener('click', openAddModal);
        careerGrid.appendChild(addCard);
    }

    // --- NEW: Firestore Database Logic ---
    async function toggleSaveCareer(careerId, buttonElement) {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert("Please sign in to save careers.");
            return;
        }

        const docRef = db.collection('users').doc(user.uid).collection('savedCareers').doc(careerId);
        const isSaved = buttonElement.classList.contains('saved');

        if (isSaved) {
            // Unsave the career by deleting the document
            await docRef.delete();
            buttonElement.classList.remove('saved');
        } else {
            // Save the career by creating the document
            await docRef.set({ savedAt: firebase.firestore.FieldValue.serverTimestamp() });
            buttonElement.classList.add('saved');
        }
    }

    async function loadSavedCareers() {
        const user = firebase.auth().currentUser;
        if (!user) return; // Only run if a user is logged in

        const querySnapshot = await db.collection('users').doc(user.uid).collection('savedCareers').get();
        const savedCareerIds = new Set();
        querySnapshot.forEach(doc => {
            savedCareerIds.add(doc.id);
        });

        // Loop through all the cards on the page and update their save button state
        document.querySelectorAll('.career-card').forEach(card => {
            const careerId = card.dataset.careerId;
            if (savedCareerIds.has(careerId)) {
                card.querySelector('.save-btn').classList.add('saved');
            }
        });
    }


    // --- All Modal & Form Logic (Mostly unchanged) ---
    function openViewModal(careerId) {
        const data = allCareerData.find(c => c.id === careerId);
        if (!data) return;
        viewCareerModal.querySelector('.modal__title').textContent = data.title;
        viewCareerModal.querySelector('.modal__description').textContent = data.description;
        viewCareerModal.querySelector('.modal__salary').textContent = data.salary;
        viewCareerModal.querySelector('.modal__growth').textContent = data.growth;
        const skillsList = viewCareerModal.querySelector('.modal__skills');
        skillsList.innerHTML = '';
        data.skills.forEach(skill => {
            const li = document.createElement('li');
            li.textContent = skill;
            skillsList.appendChild(li);
        });
        viewCareerModal.classList.add('modal-active');
        document.body.classList.add('body-no-scroll');
    }

    function openAddModal() {
        addCareerForm.style.display = 'block';
        successMessage.style.display = 'none';
        addCareerModal.classList.add('modal-active');
        document.body.classList.add('body-no-scroll');
    }

    function closeModal(modal) {
        modal.classList.remove('modal-active');
        document.body.classList.remove('body-no-scroll');
    }

    function setupEventListeners() {
        viewCareerCloseBtn.addEventListener('click', () => closeModal(viewCareerModal));
        viewCareerModal.addEventListener('click', (event) => {
            if (event.target === viewCareerModal) closeModal(viewCareerModal);
        });
        addCareerCloseBtn.addEventListener('click', () => closeModal(addCareerModal));
        addCareerModal.addEventListener('click', (event) => {
            if (event.target === addCareerModal) closeModal(addCareerModal);
        });
    }

    addCareerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(this);
        const action = this.getAttribute('action');
        fetch(action, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' }
        }).then(response => {
            if (response.ok) {
                addCareerForm.style.display = 'none';
                successMessage.style.display = 'block';
                addCareerForm.reset();
            } else {
                alert('Oops! There was a problem submitting your form.');
            }
        }).catch(() => {
            alert('Oops! There was an error.');
        });
    });
});