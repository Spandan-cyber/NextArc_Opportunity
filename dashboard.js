/*=============== SHOW MENU, DARK MODE, SCROLL UP LOGIC ===============*/
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

/*=============== DASHBOARD PAGE LOGIC ===============*/
document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();
  let allCareerData = [];

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

  fetch("careers.json")
    .then((res) => res.json())
    .then((data) => {
      allCareerData = data;
      auth.onAuthStateChanged((user) => {
        if (user) {
          populateUserProfile(user);
          loadUserSkills(user.uid);
          loadSavedCareers(user.uid);
        } else {
          window.location.href = "index.html";
        }
      });
    });

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

  addSkillForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const skill = skillInput.value.trim();
    if (!skill) return;
    const user = auth.currentUser;
    if (!user) return;
    await db
      .collection("users")
      .doc(user.uid)
      .set(
        { skills: firebase.firestore.FieldValue.arrayUnion(skill) },
        { merge: true }
      );
    skillInput.value = "";
    loadUserSkills(user.uid);
  });

  skillsList.addEventListener("click", async (e) => {
    if (
      e.target.classList.contains("remove-skill") ||
      e.target.closest(".remove-skill")
    ) {
      const skill = e.target.closest(".remove-skill").dataset.skill;
      const user = auth.currentUser;
      if (!user) return;
      await db
        .collection("users")
        .doc(user.uid)
        .update({ skills: firebase.firestore.FieldValue.arrayRemove(skill) });
      loadUserSkills(user.uid);
    }
  });

  async function loadUserSkills(userId) {
    const userDoc = await db.collection("users").doc(userId).get();
    const userSkills =
      userDoc.exists && userDoc.data().skills ? userDoc.data().skills : [];
    displayUserSkills(userSkills);
    generateRecommendations(userSkills);
  }

  function displayUserSkills(skills) {
    skillsList.innerHTML = "";
    if (skills.length === 0) {
      skillsList.innerHTML = "<p>No skills added yet.</p>";
      return;
    }
    skills.forEach((skill) => {
      const tag = document.createElement("div");
      tag.className = "skill-tag";
      tag.innerHTML = `<span>${skill}</span><button class="remove-skill" data-skill="${skill}">&times;</button>`;
      skillsList.appendChild(tag);
    });
  }

  function generateRecommendations(userSkills) {
    if (!userSkills || userSkills.length === 0) {
      recommendationsGrid.innerHTML = `<p>Add skills to see recommendations.</p>`;
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
    displayCareers(recommendedCareers, recommendationsGrid);
  }

  async function loadSavedCareers(userId) {
    loadingMessage.style.display = "block";
    savedCareersGrid.innerHTML = "";
    try {
      const savedCareersQuery = await db
        .collection("users")
        .doc(userId)
        .collection("savedCareers")
        .get();
      const savedCareerIds = new Set();
      savedCareersQuery.forEach((doc) => savedCareerIds.add(doc.id));
      if (savedCareerIds.size === 0) {
        loadingMessage.textContent = "You haven't saved any careers yet.";
        return;
      }
      const savedCareers = allCareerData.filter((career) =>
        savedCareerIds.has(career.id)
      );
      displayCareers(savedCareers, savedCareersGrid);
      loadingMessage.style.display = "none";
    } catch (error) {
      console.error("Error loading saved careers:", error);
      loadingMessage.textContent = "Could not load saved careers.";
    }
  }

  function displayCareers(careers, gridElement) {
    gridElement.innerHTML = "";
    if (careers.length === 0) {
      gridElement.innerHTML = "<p>No matching careers found.</p>";
      return;
    }
    careers.forEach((career) => {
      const card = document.createElement("div");
      card.className = "career-card";
      card.innerHTML = `<h3>${
        career.title
      }</h3><p>${career.description.substring(0, 100)}...</p>`;
      gridElement.appendChild(card);
    });
  }
});
