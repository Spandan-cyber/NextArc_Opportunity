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
    localStorage.setItem("dark", "dark");
    themeIcon.classList.remove("ri-moon-line");
    themeIcon.classList.add("ri-sun-line");
  } else {
    localStorage.setItem("light", "dark");
    themeIcon.classList.remove("ri-sun-line");
    themeIcon.classList.add("ri-moon-line");
  }
});
applySavedTheme();

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

/*=============== ALL CAREERS PAGE LOGIC ===============*/
document.addEventListener("DOMContentLoaded", () => {
  const careerGrid = document.getElementById("all-careers-grid");
  const requestContainer = document.getElementById("request-container");
  const careerNameInput = document.getElementById("career-name-input");
  const filterContainer = document.getElementById("filter-container");
  const sortSelect = document.getElementById("sort-select"); // NEW SORT SELECTOR
  const viewCareerModal = document.getElementById("career-modal");
  const viewCareerCloseBtn = viewCareerModal.querySelector(".modal__close");
  const addCareerModal = document.getElementById("add-career-modal");
  const addCareerCloseBtn = addCareerModal.querySelector(".modal__close");
  const addCareerForm = document.getElementById("add-career-form");
  const successMessage = document.getElementById("submission-success");
  const db = firebase.firestore();
  let allCareerData = [];

  const growthMapping = {
    Exploding: 5,
    "Very High": 4,
    High: 3,
    Growing: 2,
    Stable: 1,
    None: 0,
  };

  let currentActiveTag = "All"; // State to manage filtering

  fetch("careers.json")
    .then((response) => response.json())
    .then((data) => {
      allCareerData = data;
      createFilterButtons(allCareerData);

      const searchQuery = new URLSearchParams(window.location.search).get(
        "search"
      );
      handleInitialDisplay(searchQuery);

      setupEventListeners();
      loadSavedCareers();
    })
    .catch((error) => console.error("Error fetching career data:", error));

  // --- INITIAL DISPLAY & SEARCH HANDLER ---
  function handleInitialDisplay(searchQuery) {
    let careersToDisplay = allCareerData;

    if (searchQuery) {
      careersToDisplay = allCareerData.filter(
        (career) =>
          career.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          career.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (career.skills &&
            career.skills
              .join(" ")
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }
    displayContent(careersToDisplay, searchQuery);
  }

  // --- SORTING LOGIC ---
  function applySorting(careers, sortBy) {
    let sortedCareers = [...careers];

    switch (sortBy) {
      case "growth-desc":
        sortedCareers.sort(
          (a, b) =>
            (growthMapping[b.growth] || 0) - (growthMapping[a.growth] || 0)
        );
        break;
      case "salary-desc":
        sortedCareers.sort((a, b) => {
          const salaryA = parseFloat(a.salary?.replace(/[^0-9.]/g, "") || 0);
          const salaryB = parseFloat(b.salary?.replace(/[^0-9.]/g, "") || 0);
          return salaryB - salaryA;
        });
        break;
      case "title-asc":
        sortedCareers.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "default":
      default:
      // No action needed
    }
    return sortedCareers;
  }

  // --- MAIN RENDER FUNCTION ---
  function displayContent(careers, searchQuery, activeTag = currentActiveTag) {
    // 1. Check for search/no results
    if (searchQuery && careers.length === 0) {
      careerGrid.style.display = "none";
      requestContainer.style.display = "block";
      if (careerNameInput) careerNameInput.value = searchQuery;
      return;
    }

    // 2. Filter by current active tag state
    let filteredByTag = careers;
    if (activeTag !== "All") {
      filteredByTag = careers.filter(
        (c) => c.tags && c.tags.includes(activeTag)
      );
    }

    // 3. Apply sorting
    const sortBy = sortSelect.value;
    const finalCareers = applySorting(filteredByTag, sortBy);

    // 4. Render
    careerGrid.innerHTML = "";
    requestContainer.style.display = "none";
    careerGrid.style.display = "grid";

    finalCareers.forEach((career) => {
      const card = document.createElement("div");
      card.className = "career-card";
      card.dataset.careerId = career.id;

      // Add Save Button
      const saveButtonHtml = `<button class="save-btn" aria-label="Save career" data-career-id="${career.id}"><i class="ri-bookmark-line"></i></button>`;

      card.innerHTML = `${saveButtonHtml}<h3>${
        career.title
      }</h3><p>${career.description.substring(0, 100)}...</p>`;
      card.addEventListener("click", () => openViewModal(career.id));

      // Attach save event listener
      const saveBtn = card.querySelector(".save-btn");
      if (saveBtn) {
        saveBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          toggleSaveCareer(career.id, saveBtn);
        });
      }
      careerGrid.appendChild(card);
    });

    // Always add the 'Suggest a Career' card
    const addCard = document.createElement("div");
    addCard.className = "add-career-card";
    addCard.innerHTML = `<i class="ri-add-line"></i><h3>Suggest a Career</h3>`;
    addCard.addEventListener("click", openAddModal);
    careerGrid.appendChild(addCard);

    // Reload saved status to show filled bookmarks
    loadSavedStatusForAllCards();
  }

  // --- FILTER BUTTON LOGIC ---
  function createFilterButtons(careers) {
    const allTags = new Set();
    careers.forEach((career) => {
      if (career.tags) {
        career.tags.forEach((tag) => allTags.add(tag));
      }
    });
    filterContainer.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.className = "filter-btn active";
    allBtn.textContent = "All";
    allBtn.addEventListener("click", () => handleFilterClick("All"));
    filterContainer.appendChild(allBtn);

    Array.from(allTags)
      .sort()
      .forEach((tag) => {
        const btn = document.createElement("button");
        btn.className = "filter-btn";
        btn.textContent = tag;
        btn.addEventListener("click", () => handleFilterClick(tag));
        filterContainer.appendChild(btn);
      });
  }

  function handleFilterClick(selectedTag) {
    currentActiveTag = selectedTag;
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.textContent === selectedTag);
    });
    displayContent(allCareerData, null, selectedTag);
  }

  // --- EVENT LISTENERS & MODALS ---
  function setupEventListeners() {
    // Sort listener
    sortSelect.addEventListener("change", () =>
      displayContent(allCareerData, null)
    );

    // Modal listeners
    if (viewCareerCloseBtn)
      viewCareerCloseBtn.addEventListener("click", () =>
        closeModal(viewCareerModal)
      );
    if (viewCareerModal)
      viewCareerModal.addEventListener("click", (event) => {
        if (event.target === viewCareerModal) closeModal(viewCareerModal);
      });
    if (addCareerCloseBtn)
      addCareerCloseBtn.addEventListener("click", () =>
        closeModal(addCareerModal)
      );
    if (addCareerModal)
      addCareerModal.addEventListener("click", (event) => {
        if (event.target === addCareerModal) closeModal(addCareerModal);
      });

    // Form submission (Suggest a Career)
    addCareerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const formData = new FormData(this);
      const action = this.getAttribute("action");
      fetch(action, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      })
        .then((response) => {
          if (response.ok) {
            addCareerForm.style.display = "none";
            successMessage.style.display = "block";
            addCareerForm.reset();
          } else {
            alert("Oops! There was a problem submitting your form.");
          }
        })
        .catch(() => {
          alert("Oops! There was an error submitting your form.");
        });
    });
  }

  // --- FIRESTORE LOGIC ---
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
    try {
      if (isSaved) {
        await docRef.delete();
        buttonElement.classList.remove("saved");
      } else {
        await docRef.set({
          savedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        buttonElement.classList.add("saved");
      }
    } catch (error) {
      console.error("Error toggling saved career:", error);
      alert("Could not update saved career. Please try again.");
    }
  }

  async function loadSavedCareers() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    try {
      const querySnapshot = await db
        .collection("users")
        .doc(user.uid)
        .collection("savedCareers")
        .get();
      const savedCareerIds = new Set(querySnapshot.docs.map((doc) => doc.id));
      loadSavedStatusForAllCards(savedCareerIds);
    } catch (error) {
      console.error("Error loading saved status:", error);
    }
  }

  async function loadSavedStatusForAllCards() {
    const user = firebase.auth().currentUser;
    if (!user) {
      document
        .querySelectorAll(".save-btn")
        .forEach((btn) => btn.classList.remove("saved"));
      return;
    }
    const querySnapshot = await db
      .collection("users")
      .doc(user.uid)
      .collection("savedCareers")
      .get();
    const savedCareerIds = new Set(querySnapshot.docs.map((doc) => doc.id));

    document
      .querySelectorAll(".career-card[data-career-id]")
      .forEach((card) => {
        const careerId = card.dataset.careerId;
        const saveBtn = card.querySelector(".save-btn");
        if (saveBtn) {
          saveBtn.classList.toggle("saved", savedCareerIds.has(careerId));
        }
      });
  }

  // --- MODAL POPULATE ---
  function openViewModal(careerId) {
    const data = allCareerData.find((c) => c.id === careerId);
    if (!data) return;
    viewCareerModal.querySelector(".modal__title").textContent = data.title;
    viewCareerModal.querySelector(".modal__description").textContent =
      data.description;
    viewCareerModal.querySelector(".modal__salary").textContent = data.salary;
    viewCareerModal.querySelector(".modal__growth").textContent = data.growth;
    const skillsList = viewCareerModal.querySelector(".modal__skills");
    skillsList.innerHTML = "";
    data.skills.forEach((skill) => {
      const li = document.createElement("li");
      li.textContent = skill;
      skillsList.appendChild(li);
    });
    viewCareerModal.classList.add("modal-active");
    document.body.classList.add("body-no-scroll");
  }

  function openAddModal() {
    addCareerForm.style.display = "block";
    successMessage.style.display = "none";
    addCareerModal.classList.add("modal-active");
    document.body.classList.add("body-no-scroll");
  }

  function closeModal(modal) {
    modal.classList.remove("modal-active");
    document.body.classList.remove("body-no-scroll");
  }
  /* In BOTH script.js AND careers.js */

  // --- NEW: AI FETCH FUNCTION ---
  async function loadAiCareerInsight(jobTitle, skills) {
    const insightText = document.getElementById("ai-insight-text");
    if (!insightText) return;

    const apiKey = "AIzaSyBXFTRWp13YVXqW1IHxVNR9wokO-KvFABg"; // Use the same key as your chat bot

    insightText.textContent = "Analyzing global job trends (Loading)...";

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const prompt = `Provide a very concise, 2-sentence summary of the future outlook for a '${jobTitle}' given its core skills are: ${skills.join(
      ", "
    )}. Focus only on demand and long-term viability, and do not use lists or bullet points.`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      const botResponseText =
        result.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis failed.";

      insightText.textContent = botResponseText;
    } catch (error) {
      console.error("Gemini Insight Error:", error);
      insightText.textContent =
        "Analysis currently unavailable. Check your network connection or API key.";
    }
  }
});
