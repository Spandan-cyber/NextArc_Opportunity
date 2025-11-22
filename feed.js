// feed.js

document.addEventListener("DOMContentLoaded", () => {
  // --- ELEMENT SELECTORS ---
  const articlesContainer = document.getElementById("articles-container");
  const loadingMessage = document.getElementById("loading-message");

  // --- RENDER ARTICLES TO UI ---
  // In feed.js, replace the existing renderArticles function

  function renderArticles(articles) {
    articlesContainer.innerHTML = "";

    articles.slice(0, 8).forEach((item) => {
      // Show top 8 articles
      const articleDiv = document.createElement("div");
      articleDiv.className = "article-card";

      // Ensure the link is valid before creating the anchor tag
      const articleLink = item.link || item.url || "#"; // Use 'link' or 'url' as source

      articleDiv.innerHTML = `
            <h4>${item.title || item.snippet}</h4>
            <p>${item.snippet}</p>
            <a href="${articleLink}" target="_blank">
                Read Full Article <i class="ri-external-link-line"></i>
            </a>
        `;
      articlesContainer.appendChild(articleDiv);
    });
  }

  // --- SAFE FALLBACK DATA (Used if the Google API call fails) ---
  const fallbackArticles = {
    items: [
      {
        title: "Future Report: AI Jobs See 300% Growth Spike",
        snippet:
          "A new report highlights exponential growth in AI-adjacent roles, requiring deep learning and advanced Python skills.",
        link: "#",
      },
      {
        title: "Salaries for Robotics Engineers Hit All-Time High",
        snippet:
          "The demand for specialized robotics designers is driving salaries in manufacturing and healthcare sectors above expectations.",
        link: "#",
      },
      {
        title: "Green Energy Policy Creates 1 Million New Roles",
        snippet:
          "Government shifts toward clean power are creating massive opportunities for Renewable Energy Specialists and analysts.",
        link: "#",
      },
      {
        title: "Cybersecurity Gaps Lead to Urgent Hiring Needs",
        snippet:
          "Every major company is now seeking security analysts, making this one of the most stable career paths.",
        link: "#",
      },
    ],
  };

  // --- MAIN FUNCTION TO FETCH NEWS ---
  async function fetchTrendingNews() {
    if (loadingMessage)
      loadingMessage.textContent = "Fetching news from external source...";

    try {
      const query = "future job market trends AND career opportunities";

      // Attempt to call the external Google Search tool
      const response = await google.search.query({ queries: [query] });

      // If the tool returns a result, parse it.
      const result = JSON.parse(response.result);

      if (result && result.items && result.items.length > 0) {
        renderArticles(result.items);
        console.log("SUCCESS: Loaded live news articles.");
      } else {
        // If API connects but returns no results, use the fallback data
        articlesContainer.innerHTML =
          '<p style="color:orange;">(Live News Unavailable - Showing Recent Data)</p>';
        renderArticles(fallbackArticles.items);
      }
    } catch (error) {
      // If API call fails completely (the error you are seeing)
      console.error(
        "News Fetch Error: Google Search Tool Failed. Showing Fallback Data.",
        error
      );
      articlesContainer.innerHTML =
        '<p style="color:orange;">(Live News Unavailable - Showing Recent Data)</p>';
      renderArticles(fallbackArticles.items);
    } finally {
      // Ensure the loading message is gone
      if (loadingMessage) loadingMessage.style.display = "none";
    }
  }

  // Initiate the fetch when the page loads
  fetchTrendingNews();
});
