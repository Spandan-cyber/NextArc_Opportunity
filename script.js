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

/*=============== DYNAMIC CAREER LOADING & MODALS (HOMEPAGE) ===============*/
document.addEventListener("DOMContentLoaded", () => {
  const careerGrid = document.querySelector(".career-grid");
  const modal = document.getElementById("career-modal");
  const db = firebase.firestore();
  if (!modal || !careerGrid) return;
  const modalCloseBtn = modal.querySelector(".modal__close");
  let allCareerData = [];

  // Helper function to display skeletons
  function displaySkeletons(count) {
    careerGrid.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement("div");
      skeleton.className = "skeleton-card";
      skeleton.innerHTML = `<div class="line"></div><div class="line short"></div><div class="line short"></div>`;
      careerGrid.appendChild(skeleton);
    }
  }

  // Helper function to shuffle array for random selection
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  displaySkeletons(5);

  fetch("careers.json")
    .then((response) => response.json())
    .then((data) => {
      allCareerData = data;
      setupAISearch(allCareerData);
      const shuffledCareers = shuffleArray([...allCareerData]);
      const randomFiveCareers = shuffledCareers.slice(0, 5);
      displayCareers(randomFiveCareers);
      setupModalEventListeners();
      loadSavedCareers();
      setupGrowthChart(allCareerData); // CHART IS CALLED HERE
    })
    .catch((error) => console.error("Error fetching trending careers:", error));

  function displayCareers(careersToDisplay) {
    careerGrid.innerHTML = "";
    careersToDisplay.forEach((career) => {
      const card = document.createElement("div");
      card.className = "career-card";
      card.dataset.careerId = career.id;
      card.innerHTML = `<button class="save-btn" aria-label="Save career"><i class="ri-bookmark-line"></i></button><h3>${
        career.title
      }</h3><p>${career.description.substring(0, 80)}...</p>`;
      card.addEventListener("click", () => openModal(career.id));
      const saveBtn = card.querySelector(".save-btn");
      saveBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSaveCareer(career.id, saveBtn);
      });
      careerGrid.appendChild(card);
    });
  }
  function setupAISearch(careerData) {
    const aiSearchForm = document.getElementById("ai-search-form");
    const aiSearchInput = document.getElementById("ai-search-input");

    if (aiSearchForm) {
      aiSearchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const userQuery = aiSearchInput.value.trim();
        if (userQuery) {
          runAiSearch(userQuery, careerData); // Pass the data to the function
        }
      });
    }
  }

  async function runAiSearch(userQuery, careerData) {
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
    const card = buttonElement.closest(".career-card"); // Get card element

    if (isSaved) {
      await docRef.delete();
      buttonElement.classList.remove("saved");
    } else {
      await docRef.set({
        savedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      buttonElement.classList.add("saved");

      // FUN FIX: Trigger the pulse animation on the card
      card.classList.add("saved-pulse");
      setTimeout(() => {
        card.classList.remove("saved-pulse");
      }, 400); // 400ms matches the animation duration
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
      } else {
        document
          .querySelectorAll(".save-btn")
          .forEach((btn) => btn.classList.remove("saved"));
      }
    });
  }

  // In script.js, replace the existing openModal function

  function openModal(careerId) {
    const data = allCareerData.find((c) => c.id === careerId);
    if (!data) return;

    // Populate the rest of the modal
    modal.querySelector(".modal__title").textContent = data.title;
    // ... (rest of existing population logic) ...

    // NEW: Call AI function
    loadAiCareerInsight(data.title, data.skills);

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

  // --- FUNCTION TO RENDER GROWTH CHART ---
  // In script.js, replace the existing setupGrowthChart function with this one:

  function setupGrowthChart(careers) {
    const ctx = document.getElementById("growth-opportunities-chart");
    if (!ctx || typeof Chart === "undefined") return;

    const rootStyle = getComputedStyle(document.body);
    const textColor = rootStyle.getPropertyValue("--text-color").trim();
    Chart.defaults.color = textColor;

    const growthMapping = {
      "Very High": 4,
      High: 3,
      Growing: 2,
      Stable: 1,
      Exploding: 5,
      None: 0,
    };

    const chartData = careers
      .filter((c) => c.growth && c.growth !== "None")
      .map((c) => ({
        title: c.title,
        growthValue: growthMapping[c.growth] || 1,
        growthLabel: c.growth,
      }))
      .sort((a, b) => b.growthValue - a.growthValue)
      .slice(0, 7);

    const labels = chartData.map((c) => c.title);
    const dataValues = chartData.map((c) => c.growthValue);

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Growth Potential",
            data: dataValues,
            backgroundColor: "rgba(60, 180, 255, 0.9)",
            borderColor: "rgba(60, 180, 255, 1)",
            borderWidth: 1,
            borderRadius: 6,
            hoverBackgroundColor: "rgba(255, 153, 0, 0.9)",
            // NEW: Hover Effect for Bars
            hoverBorderWidth: 2,
            hoverBorderColor: "var(--white-color)",
            barThickness: 20,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 10,
        },

        // NEW: Animation for smooth rendering
        animation: {
          duration: 1500, // Smooth 1.5 second animation
          easing: "easeOutQuart", // Smooth easing function
        },

        scales: {
          x: {
            beginAtZero: true,
            max: 5,
            grid: {
              display: false,
            },
            ticks: {
              callback: function (value, index, values) {
                const rating = Object.keys(growthMapping).find(
                  (key) => growthMapping[key] === value
                );
                return rating || "";
              },
              color: "var(--text-color)",
            },
          },
          y: {
            grid: {
              display: false, // Remove Y-AXIS (Horizontal) grid lines for cleaner look
            },
            ticks: {
              color: "var(--text-color)",
              font: {
                weight: "bold", // Make career titles stand out
              },
            },
          },
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Top 7 Careers by Future Growth Potential",
            color: "var(--text-color)",
          },
        },
      },
    });
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

/*=============== AI SEARCH AND SUMMARIZATION (NEW) ===============*/
document.addEventListener("DOMContentLoaded", () => {
  // ... (Your existing code for career loading, modals, etc.) ...

  // --- AI SEARCH ELEMENTS ---
  const aiSearchForm = document.getElementById("ai-search-form");
  const aiSearchInput = document.getElementById("ai-search-input");
  const aiAnswerOutput = document.getElementById("ai-answer-output");
  const aiSearchButton = document.getElementById("ai-search-button");

  // Assume allCareerData is loaded from careers.json (from the DOMContentLoaded block above)
  let allCareerData = [];

  // Final logic is inside the main DOMContentLoaded block, but written here for clarity:

  if (aiSearchForm) {
    aiSearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const userQuery = aiSearchInput.value.trim();
      if (userQuery) {
        runAiSearch(userQuery);
      }
    });
  }

  async function runAiSearch(userQuery) {
    if (typeof firebase === "undefined") {
      aiAnswerOutput.innerHTML =
        '<p style="color:red;">Error: AI feature requires active user session.</p>';
      return;
    }

    aiSearchButton.disabled = true;
    aiAnswerOutput.innerHTML = "<p>Analyzing data with Gemini AI...</p>";

    // 1. Construct the data context from your careers.json
    const dataContext = JSON.stringify(
      allCareerData.map((c) => ({
        title: c.title,
        growth: c.growth,
        salary: c.salary,
        skills: c.skills.slice(0, 3).join(", "),
      }))
    );

    const apiKey = "AIzaSyBXFTRWp13YVXqW1IHxVNR9wokO-KvFABg";

    // AFTER (Enables Analysis and Comparison):
    const systemPrompt = `You are a career data analyst named Gemini. Your goal is to analyze the provided JSON data of careers and answer comparative or specific questions. Use only the data provided. Your output must be concise and based on numerical or keyword comparisons. Example: To find the highest salary, compare all salary values in the JSON.`;

    const prompt = `User Question: "${userQuery}".\n\nData Context:\n${dataContext}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        aiAnswerOutput.innerHTML =
          '<p style="color:red;">AI Error: Failed to connect to service. Check network or API key.</p>';
        return;
      }

      const result = await response.json();
      const botResponseText =
        result.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis failed.";

      aiAnswerOutput.innerHTML = `<p>${botResponseText}</p>`;
    } catch (error) {
      console.error("AI Search Error:", error);
      aiAnswerOutput.innerHTML =
        '<p style="color:red;">Error: Could not process request. Please check console.</p>';
    } finally {
      aiSearchButton.disabled = false;
    }
  }

  // Now, ensure the runAiSearch function is integrated into your main script.js logic flow.
});

// Since script.js is large, ensure you replace the old search block with this new AI block.

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
