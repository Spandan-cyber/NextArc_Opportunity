/*=============== SHOW MENU ===============*/
const navMenu = document.getElementById("nav-menu"),
  navToggle = document.getElementById("nav-toggle"),
  navClose = document.getElementById("nav-close");
if (navToggle) {
  navToggle.addEventListener("click", () => {
    navMenu.classList.add("show-menu");
  });
}
if (navClose) {
  navClose.addEventListener("click", () => {
    navMenu.classList.remove("show-menu");
  });
}

/*=============== DARK/LIGHT THEME TOGGLE ===============*/
const themeToggle = document.getElementById("theme-toggle");
const body = document.body;
const themeIcon = themeToggle.querySelector("i");
const applySavedTheme = () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    body.classList.add("dark-mode");
    themeIcon.classList.remove("ri-moon-line");
    themeIcon.classList.add("ri-sun-line");
  } else {
    body.classList.remove("dark-mode");
    themeIcon.classList.remove("ri-sun-line");
    themeIcon.classList.add("ri-moon-line");
  }
};
themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");
  if (body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
    themeIcon.classList.remove("ri-moon-line");
    themeIcon.classList.add("ri-sun-line");
  } else {
    localStorage.setItem("theme", "light");
    themeIcon.classList.remove("ri-sun-line");
    themeIcon.classList.add("ri-moon-line");
  }
});
applySavedTheme();

/*=============== DYNAMIC CAREER LOADING & MODALS (HOMEPAGE) ===============*/
document.addEventListener("DOMContentLoaded", () => {
  const careerGrid = document.querySelector(".career-grid");
  const modal = document.getElementById("career-modal");
  const db = firebase.firestore();
  if (!modal || !careerGrid) return;
  const modalCloseBtn = modal.querySelector(".modal__close");
  let allCareerData = [];
  function displaySkeletons(count) {
    careerGrid.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement("div");
      skeleton.className = "skeleton-card";
      skeleton.innerHTML = `
                <div class="line"></div>
                <div class="line short"></div>
                <div class="line short"></div>
            `;
      careerGrid.appendChild(skeleton);
    }
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  displaySkeletons(5); // Show 5 skeleton cards while loading

  fetch("careers.json")
    .then((response) => response.json())
    .then((data) => {
      allCareerData = data;
      const shuffledCareers = shuffleArray([...allCareerData]);
      const randomFiveCareers = shuffledCareers.slice(0, 5);
      displayCareers(randomFiveCareers);
      setupModalEventListeners();
      loadSavedCareers();
    })
    .catch((error) => console.error("Error fetching trending careers:", error));

  function displayCareers(careersToDisplay) {
    careerGrid.innerHTML = "";
    careersToDisplay.forEach((career) => {
      const card = document.createElement("div");
      card.className = "career-card";
      card.dataset.careerId = career.id;
      card.innerHTML = `
                <button class="save-btn" aria-label="Save career">
                    <i class="ri-bookmark-line"></i>
                </button>
                <h3>${career.title}</h3>
                <p>${career.description.substring(0, 80)}...</p> 
            `;
      card.addEventListener("click", () => openModal(career.id));
      const saveBtn = card.querySelector(".save-btn");
      saveBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSaveCareer(career.id, saveBtn);
      });
      careerGrid.appendChild(card);
    });
  }

  async function toggleSaveCareer(careerId, buttonElement) {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert("Please sign in to save careers.");
      return;
    }
    const docRef = db
      .collection("users")
      .doc(user.uid)
      .collection("savedCareers")
      .doc(careerId);
    const isSaved = buttonElement.classList.contains("saved");
    if (isSaved) {
      await docRef.delete();
      buttonElement.classList.remove("saved");
    } else {
      await docRef.set({
        savedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      buttonElement.classList.add("saved");
    }
  }

  async function loadSavedCareers() {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        const querySnapshot = await db
          .collection("users")
          .doc(user.uid)
          .collection("savedCareers")
          .get();
        const savedCareerIds = new Set();
        querySnapshot.forEach((doc) => {
          savedCareerIds.add(doc.id);
        });
        document.querySelectorAll(".career-card").forEach((card) => {
          const careerId = card.dataset.careerId;
          const saveBtn = card.querySelector(".save-btn");
          if (savedCareerIds.has(careerId)) {
            saveBtn.classList.add("saved");
          } else {
            saveBtn.classList.remove("saved");
          }
        });
      } else {
        // If user logs out, remove all 'saved' states from the UI
        document
          .querySelectorAll(".save-btn")
          .forEach((btn) => btn.classList.remove("saved"));
      }
    });
  }

  function openModal(careerId) {
    const data = allCareerData.find((c) => c.id === careerId);
    if (!data) return;
    modal.querySelector(".modal__title").textContent = data.title;
    modal.querySelector(".modal__description").textContent = data.description;
    modal.querySelector(".modal__salary").textContent = data.salary;
    modal.querySelector(".modal__growth").textContent = data.growth;
    const skillsList = modal.querySelector(".modal__skills");
    skillsList.innerHTML = "";
    data.skills.forEach((skill) => {
      const li = document.createElement("li");
      li.textContent = skill;
      skillsList.appendChild(li);
    });
    modal.classList.add("modal-active");
    document.body.classList.add("body-no-scroll");
  }

  function closeModal() {
    modal.classList.remove("modal-active");
    document.body.classList.remove("body-no-scroll");
  }

  function setupModalEventListeners() {
    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }
});

/*=============== HOMEPAGE SEARCH REDIRECT ===============*/
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      window.location.href = `careers.html?search=${encodeURIComponent(query)}`;
    }
  });
}

/*=============== SHOW SCROLL UP ===============*/
const scrollUp = document.getElementById("scroll-up");
if (scrollUp) {
  window.addEventListener("scroll", () => {
    if (window.scrollY >= 400) {
      scrollUp.classList.add("show-scroll");
    } else {
      scrollUp.classList.remove("show-scroll");
    }
  });
}
