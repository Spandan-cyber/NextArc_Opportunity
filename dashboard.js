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

/*=============== DASHBOARD PAGE LOGIC ===============*/
document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();
  let allCareerData = [];

  // --- ELEMENT SELECTORS ---
  const profileForm = document.getElementById("profile-form");
  const nameInput = document.getElementById("name-input");
  const photoInput = document.getElementById("photo-input");
  const profilePreview = document.getElementById("profile-preview");
  const fileNameDisplay = document.getElementById("file-name-display");
  const addSkillForm = document.getElementById("add-skill-form");
  const skillInput = document.getElementById("skill-input");
  const skillsList = document.getElementById("skills-list");
  const recommendationsGrid = document.getElementById("recommendations-grid");
  const savedCareersGrid = document.getElementById("saved-careers-grid");
  const loadingMessage = document.getElementById("loading-message");

  const statMemberSince = document.getElementById("stat-member-since");
  const statTotalSkills = document.getElementById("stat-total-skills");
  const statCareersSaved = document.getElementById("stat-careers-saved");

  // --- INITIAL LOAD ---
  fetch("careers.json")
    .then((res) => res.json())
    .then((data) => {
      allCareerData = data;
      auth.onAuthStateChanged((user) => {
        if (user) {
          populateUserProfile(user);
          loadUserSkills(user.uid);
          loadSavedCareers(user.uid);
          updatePersonalStats(user.uid);
        } else {
          window.location.href = "index.html";
        }
      });
    });

  // --- STATS LOGIC ---
  async function updatePersonalStats(userId) {
    const user = auth.currentUser;
    if (!user) return;
    const creationDate = new Date(user.metadata.creationTime);
    if (statMemberSince)
      statMemberSince.textContent = creationDate.toLocaleDateString();

    const userDoc = await db.collection("users").doc(userId).get();
    const skillsCount =
      userDoc.exists && userDoc.data().skills
        ? userDoc.data().skills.length
        : 0;
    if (statTotalSkills) statTotalSkills.textContent = skillsCount;

    const savedSnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("savedCareers")
      .get();
    if (statCareersSaved) statCareersSaved.textContent = savedSnapshot.size;
  }

  // --- PROFILE MANAGEMENT ---
  function populateUserProfile(user) {
    nameInput.value = user.displayName || "";
    profilePreview.src =
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.displayName || "User"
      )}&background=random`;
  }

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const newName = nameInput.value.trim();
    const newPhotoFile = photoInput.files[0];
    let newPhotoURL = user.photoURL;
    try {
      if (newPhotoFile) {
        const filePath = `profile-pictures/${user.uid}/${newPhotoFile.name}`;
        const fileRef = storage.ref(filePath);
        await fileRef.put(newPhotoFile);
        newPhotoURL = await fileRef.getDownloadURL();
      }
      await user.updateProfile({ displayName: newName, photoURL: newPhotoURL });
      alert("Profile saved successfully!");
      location.reload();
    } catch (error) {
      console.error("Error updating profile: ", error);
      alert("Could not save profile.");
    }
  });

  photoInput.addEventListener("change", () => {
    fileNameDisplay.textContent =
      photoInput.files.length > 0 ? photoInput.files[0].name : "No file chosen";
  });

  // --- SKILLS MANAGEMENT ---
  addSkillForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const skillText = skillInput.value.trim();
    if (skillText) {
      try {
        const userRef = db.collection("users").doc(user.uid);
        await userRef.set(
          { skills: firebase.firestore.FieldValue.arrayUnion(skillText) },
          { merge: true }
        );
        skillInput.value = "";
        await loadUserSkills(user.uid);
      } catch (error) {
        console.error("Error adding skill:", error);
      }
    }
  });

  skillsList.addEventListener("click", async (e) => {
    if (
      e.target.classList.contains("remove-skill") ||
      e.target.closest(".remove-skill")
    ) {
      const user = auth.currentUser;
      if (!user) return;
      const skillToRemove = e.target.closest(".remove-skill").dataset.skill;
      try {
        const userRef = db.collection("users").doc(user.uid);
        await userRef.update({
          skills: firebase.firestore.FieldValue.arrayRemove(skillToRemove),
        });
        await loadUserSkills(user.uid);
      } catch (error) {
        console.error("Error removing skill:", error);
      }
    }
  });

  async function loadUserSkills(userId) {
    const userDoc = await db.collection("users").doc(userId).get();
    const userSkills =
      userDoc.exists && userDoc.data().skills ? userDoc.data().skills : [];
    displayUserSkills(userSkills);
    generateRecommendations(userSkills);
    renderSkillMap(userSkills);
  }

  function displayUserSkills(skills) {
    if (skillsList) {
      skillsList.innerHTML = "";
      if (skills.length === 0) {
        skillsList.innerHTML =
          "<p>No skills added yet. Add some to get recommendations!</p>";
        return;
      }
      skills.forEach((skill) => {
        const tag = document.createElement("div");
        tag.className = "skill-tag";
        tag.innerHTML = `<span>${skill}</span><button class="remove-skill" data-skill="${skill}"><i class="ri-close-line"></i></button>`;
        skillsList.appendChild(tag);
      });
    }
  }

  // --- RECOMMENDATIONS LOGIC ---
  function generateRecommendations(userSkills) {
    if (!recommendationsGrid) return;
    if (userSkills.length === 0) {
      recommendationsGrid.innerHTML = `<p>Add some skills above to get personalized career recommendations!</p>`;
      return;
    }
    const recommendedCareers = allCareerData.filter((career) => {
      const careerSkillsAndTags = new Set([
        ...(career.skills || []),
        ...(career.tags || []),
      ]);
      return userSkills.some((userSkill) => {
        for (const careerSkill of careerSkillsAndTags) {
          if (careerSkill.toLowerCase().includes(userSkill.toLowerCase()))
            return true;
        }
        return false;
      });
    });
    displayCareers(recommendedCareers, recommendationsGrid, true);
  }

  // --- SAVED CAREERS LOGIC (FIXED) ---
  async function loadSavedCareers(userId) {
    if (loadingMessage) loadingMessage.style.display = "block";
    if (savedCareersGrid) savedCareersGrid.innerHTML = "";
    try {
      const querySnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("savedCareers")
        .get();
      const savedCareerIds = new Set(querySnapshot.docs.map((doc) => doc.id));
      const savedCareers = allCareerData.filter((career) =>
        savedCareerIds.has(career.id)
      );
      if (savedCareers.length > 0) {
        displayCareers(savedCareers, savedCareersGrid, true);
      } else {
        if (savedCareersGrid)
          savedCareersGrid.innerHTML =
            '<p>You haven\'t saved any careers yet. Explore the <a href="careers.html">All Careers</a> page!</p>';
      }
      if (loadingMessage) loadingMessage.style.display = "none";
    } catch (error) {
      console.error("Error loading saved careers:", error);
      if (loadingMessage)
        loadingMessage.textContent = "Could not load saved careers.";
    }
  }

  // --- HELPER FUNCTION TO DISPLAY CAREER CARDS ---
  function displayCareers(careers, gridElement, includeSaveButton) {
    if (!gridElement) return;
    gridElement.innerHTML = "";
    if (careers.length === 0) {
      gridElement.innerHTML = "<p>No matching careers found.</p>";
      return;
    }
    careers.forEach((career) => {
      const card = document.createElement("div");
      card.className = "career-card";
      card.dataset.careerId = career.id;
      let saveButtonHtml = "";
      if (includeSaveButton) {
        saveButtonHtml = `<button class="save-btn" aria-label="Save career" data-career-id="${career.id}"><i class="ri-bookmark-line"></i></button>`;
      }
      card.innerHTML = `${saveButtonHtml}<h3>${
        career.title
      }</h3><p>${career.description.substring(0, 100)}...</p>`;
      gridElement.appendChild(card);
      if (includeSaveButton) {
        const saveBtn = card.querySelector(".save-btn");
        if (saveBtn) {
          saveBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleSaveCareer(career.id, saveBtn);
          });
        }
      }
    });
    if (includeSaveButton) {
      loadSavedStatusForAllCards();
    }
  }

  // --- FIRESTORE TOGGLE AND STATUS FUNCTIONS ---
  async function toggleSaveCareer(careerId, buttonElement) {
    /* ... (save logic) ... */
  }
  async function loadSavedStatusForAllCards() {
    /* ... (load status logic) ... */
  }

  // --- DELETE ACCOUNT LOGIC ---
  const deleteAccountBtn = document.getElementById("delete-account-btn");
  if (deleteAccountBtn) {
    /* ... (full delete logic) ... */
  }
  // In dashboard.js, locate the end of the main DOMContentLoaded block
  // and add this new code block before the final closing '});'

  // --- NEW: AI INTERVIEW BOT LOGIC ---
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");

  const apiKey = "AIzaSyBXFTRWp13YVXqW1IHxVNR9wokO-KvFABg"; // Canvas will provide this key at runtime

  let chatHistory = [
    {
      role: "model",
      parts: [
        {
          text: "Hello! I'm your AI Interview Coach. Tell me what career you're preparing for today, and I'll generate some questions.",
        },
      ],
    },
  ];

  // Function to scroll chat to the bottom
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Function to render a message to the UI
  function renderMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = sender === "user" ? "user-message" : "bot-message";
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
  }

  // Main function to call the Gemini API
  async function sendMessage(userQuery) {
    renderMessage("user", userQuery);

    // Add user message to history
    chatHistory.push({ role: "user", parts: [{ text: userQuery }] });

    // Add loading indicator
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "bot-message loading";
    loadingDiv.textContent = "Thinking...";
    chatMessages.appendChild(loadingDiv);
    scrollToBottom();

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // System instruction to guide the AI's role
    const systemPrompt =
      "You are a professional career coach and interviewer named Gemini. You must generate realistic, high-quality interview questions, provide encouraging feedback, or offer career advice based on the user's input. Keep your responses concise and focused on professional development and career exploration.";

    const payload = {
      contents: chatHistory,
      systemInstruction: { parts: [{ text: systemPrompt }] },
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
        result.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't generate a response.";

      // Remove loading indicator
      chatMessages.removeChild(loadingDiv);

      renderMessage("bot", botResponseText);

      // Add bot message to history
      chatHistory.push({ role: "model", parts: [{ text: botResponseText }] });
    } catch (error) {
      console.error("Gemini API Error:", error);
      if (chatMessages.contains(loadingDiv)) {
        chatMessages.removeChild(loadingDiv);
      }
      renderMessage("bot", "Error: Could not connect to the AI coach.");
    }
  }

  // Event listener for form submission
  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = chatInput.value.trim();
      if (query) {
        sendMessage(query);
        chatInput.value = ""; // Clear input field
      }
    });
  }

  // --- END AI INTERVIEW BOT LOGIC ---
});
// --- NEW: SKILL MAP VISUALIZATION ---
function renderSkillMap(userSkills) {
  const mapContainer = document.getElementById("skill-map-visualizer");
  if (!mapContainer) return;

  mapContainer.innerHTML = "";
  const containerWidth = mapContainer.clientWidth;
  const containerHeight = mapContainer.clientHeight;

  if (userSkills.length === 0) {
    mapContainer.innerHTML =
      '<p style="color:var(--card-text-color); margin: auto;">Add skills to see your skill map!</p>';
    return;
  }

  // 1. Create the CORE NODE (User)
  const coreNode = document.createElement("div");
  coreNode.className = "map-node core-skill";
  coreNode.textContent = "YOU";
  coreNode.style.top = "50%";
  coreNode.style.left = "50%";
  coreNode.style.transform = "translate(-50%, -50%)";
  mapContainer.appendChild(coreNode);

  // 2. Create Skill Nodes in a circular pattern
  userSkills.forEach((skill, index) => {
    const node = document.createElement("div");
    node.className = "map-node";
    node.textContent = skill;
    node.style.setProperty("--random-delay", Math.random() * 5);

    // Calculate position in a circle
    const radius = Math.min(containerWidth, containerHeight) * 0.3;
    const angle = (index / userSkills.length) * 2 * Math.PI;

    // Center calculation
    const x = containerWidth / 2 + radius * Math.cos(angle);
    const y = containerHeight / 2 + radius * Math.sin(angle);
    const randomOffset = Math.random() * 20 - 10;
    node.style.top = `${y + randomOffset}px`;
    node.style.left = `${x + randomOffset}px`;
    node.style.top = `${y + (Math.random() * 20 - 10)}px`; // Add random offset
    node.style.left = `${x + (Math.random() * 20 - 10)}px`;
    node.style.transform = "translate(-50%, -50%)";

    mapContainer.appendChild(node);
  });
}
// ------------------------------------
