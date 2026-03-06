const INDEX_PATH = "./public/data/papers_index.json";
const PDF_PATH = "./public/papers/papers.pdf";
const MAX_SUGGESTIONS = 6;

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const suggestionsBox = document.getElementById("suggestions");
const resultsEl = document.getElementById("results");
const resultsCountEl = document.getElementById("results-count");

let papersIndex = [];

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function queryTokens(query) {
  return normalize(query)
    .split(" ")
    .filter(Boolean);
}

function matchesEntry(entry, query) {
  const tokens = queryTokens(query);
  if (!tokens.length) return true;

  const subject = normalize(entry.subject);
  const code = normalize(entry.code);

  return tokens.every((token) => subject.includes(token) || code.includes(token));
}

function highlight(text, query) {
  const tokenList = queryTokens(query);
  const safeText = escapeHtml(text);
  if (!tokenList.length) return safeText;

  const uniqueTokens = [...new Set(tokenList)].filter(Boolean);
  if (!uniqueTokens.length) return safeText;

  const pattern = uniqueTokens.map(escapeRegex).join("|");
  const re = new RegExp(`(${pattern})`, "ig");
  return safeText.replace(re, "<mark>$1</mark>");
}

function searchPapers(query) {
  return papersIndex.filter((entry) => matchesEntry(entry, query));
}

function renderSuggestions(query) {
  const q = query.trim();

  if (!q) {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
    return;
  }

  const matches = searchPapers(q).slice(0, MAX_SUGGESTIONS);
  if (!matches.length) {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
    return;
  }

  suggestionsBox.innerHTML = matches
    .map((entry, index) => {
      const label = `${entry.subject} (${entry.code}) - Page ${entry.page}`;
      return `<button type="button" class="suggestion-item" data-index="${index}" data-value="${escapeHtml(
        entry.code
      )}">${highlight(label, q)}</button>`;
    })
    .join("");

  suggestionsBox.querySelectorAll(".suggestion-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.getAttribute("data-value") || "";
      searchInput.value = raw;
      performSearch(raw);
      suggestionsBox.style.display = "none";
      suggestionsBox.innerHTML = "";
      searchInput.focus();
    });
  });

  suggestionsBox.style.display = "block";
}

function renderResults(results, query) {
  resultsEl.innerHTML = "";
  resultsCountEl.textContent = "";

  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    return;
  }

  resultsCountEl.textContent = `${results.length} result${results.length === 1 ? "" : "s"} found`;

  if (!results.length) {
    resultsEl.innerHTML = '<p class="empty-message">No paper found for this subject or course code.</p>';
    return;
  }

  resultsEl.innerHTML = results
    .map((entry) => {
      const pdfUrl = `${PDF_PATH}#page=${encodeURIComponent(entry.page)}`;
      return `
        <article class="result-card">
          <p class="subject-text">${highlight(entry.subject, cleanedQuery)}</p>
          <p class="result-meta"><span class="result-label">Course Code:</span> ${highlight(entry.code, cleanedQuery)}</p>
          <p class="result-meta"><span class="result-label">Page:</span> ${escapeHtml(entry.page)}</p>
          <a class="open-btn" href="${pdfUrl}" target="_blank" rel="noopener noreferrer">Open Paper</a>
        </article>
      `;
    })
    .join("");
}

function performSearch(query) {
  const results = searchPapers(query);
  renderResults(results, query);
}

async function loadIndex() {
  try {
    const res = await fetch(INDEX_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load index (${res.status})`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid index format");

    papersIndex = data.filter(
      (item) => item && typeof item.subject === "string" && typeof item.code === "string" && item.page != null
    );
  } catch (error) {
    resultsCountEl.textContent = "";
    resultsEl.innerHTML = `<p class="empty-message">Unable to load papers index. Please try again.</p>`;
    console.error(error);
  }
}

searchInput.addEventListener("input", (event) => {
  const q = event.target.value;
  renderSuggestions(q);
  performSearch(q);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
  }
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const q = searchInput.value;
  performSearch(q);
  suggestionsBox.style.display = "none";
  suggestionsBox.innerHTML = "";
});

document.addEventListener("click", (event) => {
  const clickedInsideSearch = searchForm.contains(event.target);
  if (!clickedInsideSearch) {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
  }
});

loadIndex();
