/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navClose = document.getElementById('nav-close');
if(navToggle){ navToggle.addEventListener('click', () => { navMenu.classList.add('show-menu'); }); }
if(navClose){ navClose.addEventListener('click', () => { navMenu.classList.remove('show-menu'); }); }

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
    const careerGrid = document.getElementById('all-careers-grid');
    const requestContainer = document.getElementById('request-container');
    const careerNameInput = document.getElementById('career-name-input');
    const filterContainer = document.getElementById('filter-container');
    const viewCareerModal = document.getElementById('career-modal');
    const viewCareerCloseBtn = viewCareerModal.querySelector('.modal__close');
    const addCareerModal = document.getElementById('add-career-modal');
    const addCareerCloseBtn = addCareerModal.querySelector('.modal__close');
    const addCareerForm = document.getElementById('add-career-form');
    const successMessage = document.getElementById('submission-success');
    const db = firebase.firestore();
    let allCareerData = [];

    fetch('careers.json')
        .then(response => response.json())
        .then(data => {
            allCareerData = data;
            createFilterButtons(allCareerData);
            const searchQuery = new URLSearchParams(window.location.search).get('search');
            let careersToDisplay = allCareerData;
            if (searchQuery) {
                careersToDisplay = allCareerData.filter(career => 
                    career.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    career.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (career.skills && career.skills.join(' ').toLowerCase().includes(searchQuery.toLowerCase()))
                );
            }
            displayContent(careersToDisplay, searchQuery);
            setupEventListeners();
            loadSavedCareers();
        })
        .catch(error => console.error('Error fetching career data:', error));
        
    function createFilterButtons(careers) {
        const allTags = new Set();
        careers.forEach(career => {
            if (career.tags) {
                career.tags.forEach(tag => allTags.add(tag));
            }
        });
        filterContainer.innerHTML = '';
        const allBtn = document.createElement('button');
        allBtn.className = 'filter-btn active';
        allBtn.textContent = 'All';
        allBtn.addEventListener('click', () => filterByTag('All'));
        filterContainer.appendChild(allBtn);
        Array.from(allTags).sort().forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.textContent = tag;
            btn.addEventListener('click', () => filterByTag(tag));
            filterContainer.appendChild(btn);
        });
    }

    function filterByTag(selectedTag) {
        let filteredCareers;
        if (selectedTag === 'All') {
            filteredCareers = allCareerData;
        } else {
            filteredCareers = allCareerData.filter(career => career.tags && career.tags.includes(selectedTag));
        }
        displayContent(filteredCareers, null);
        loadSavedCareers();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === selectedTag);
        });
    }

    function displayContent(careers, searchQuery) {
        careerGrid.innerHTML = ''; 
        if ((careers.length > 0) || (!searchQuery)) {
            requestContainer.style.display = 'none';
            careerGrid.style.display = 'grid';
            careers.forEach(career => {
                const card = document.createElement('div');
                card.className = 'career-card';
                card.dataset.careerId = career.id;
                card.innerHTML = `<button class="save-btn" aria-label="Save career"><i class="ri-bookmark-line"></i></button><h3>${career.title}</h3><p>${career.description.substring(0, 100)}...</p>`;
                card.addEventListener('click', () => openViewModal(career.id));
                const saveBtn = card.querySelector('.save-btn');
                saveBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    toggleSaveCareer(career.id, saveBtn);
                });
                careerGrid.appendChild(card);
            });
        } else if (searchQuery) {
            careerGrid.style.display = 'none';
            requestContainer.style.display = 'block';
            if(careerNameInput) careerNameInput.value = searchQuery;
            return; 
        }
        const addCard = document.createElement('div');
        addCard.className = 'add-career-card';
        addCard.innerHTML = `<i class="ri-add-line"></i><h3>Suggest a Career</h3>`;
        addCard.addEventListener('click', openAddModal);
        careerGrid.appendChild(addCard);
    }
    
    async function toggleSaveCareer(careerId, buttonElement) {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert("Please sign in to save careers.");
            return;
        }
        const docRef = db.collection('users').doc(user.uid).collection('savedCareers').doc(careerId);
        const isSaved = buttonElement.classList.contains('saved');
        if (isSaved) {
            await docRef.delete();
            buttonElement.classList.remove('saved');
        } else {
            await docRef.set({ savedAt: firebase.firestore.FieldValue.serverTimestamp() });
            buttonElement.classList.add('saved');
        }
    }
    
    async function loadSavedCareers() {
        const user = firebase.auth().currentUser;
        if (!user) return;
        const querySnapshot = await db.collection('users').doc(user.uid).collection('savedCareers').get();
        const savedCareerIds = new Set();
        querySnapshot.forEach(doc => { savedCareerIds.add(doc.id); });
        document.querySelectorAll('.career-card[data-career-id]').forEach(card => {
            const careerId = card.dataset.careerId;
            const saveBtn = card.querySelector('.save-btn');
            if(saveBtn){
                if (savedCareerIds.has(careerId)) {
                    saveBtn.classList.add('saved');
                } else {
                    saveBtn.classList.remove('saved');
                }
            }
        });
    }

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
        if(viewCareerCloseBtn) viewCareerCloseBtn.addEventListener('click', () => closeModal(viewCareerModal));
        if(viewCareerModal) viewCareerModal.addEventListener('click', (event) => {
            if (event.target === viewCareerModal) closeModal(viewCareerModal);
        });
        if(addCareerCloseBtn) addCareerCloseBtn.addEventListener('click', () => closeModal(addCareerModal));
        if(addCareerModal) addCareerModal.addEventListener('click', (event) => {
            if (event.target === addCareerModal) closeModal(addCareerModal);
        });
    }

    if(addCareerForm){
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
                alert('Oops! There was an error submitting your form.');
            });
        });
    }
});