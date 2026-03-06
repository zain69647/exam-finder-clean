const INDEX_PATH = "data/papers_index.json";
const PDF_PATH = "papers/papers.pdf";
const MAX_SUGGESTIONS = 6;

let papers = [];

const searchInput = document.getElementById("searchInput");
const searchForm = document.getElementById("searchForm");
const searchWrapper = document.getElementById("searchWrapper");
const suggestionsEl = document.getElementById("suggestions");
const errorMsg = document.getElementById("errorMsg");
const resultCount = document.getElementById("resultCount");
const noResults = document.getElementById("noResults");
const resultsGrid = document.getElementById("resultsGrid");

// ---- Helpers ----
function normalize(str) {
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

function queryTokens(q) {
  return normalize(q).split(" ").filter(Boolean);
}

function matchesEntry(entry, query) {
  const tokens = queryTokens(query);
  if (!tokens.length) return true;
  const subject = normalize(entry.subject);
  const code = normalize(entry.code);
  return tokens.every((t) => subject.includes(t) || code.includes(t));
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text, query) {
  const tokens = [...new Set(queryTokens(query))].filter(Boolean);
  if (!tokens.length) return text;
  const pattern = tokens.map(escapeRegex).join("|");
  return text.replace(new RegExp(`(${pattern})`, "gi"), "<mark>$1</mark>");
}

// ---- Load Data ----
fetch(INDEX_PATH, { cache: "no-store" })
  .then((r) => {
    if (!r.ok) throw new Error("Failed " + r.status);
    return r.json();
  })
  .then((data) => {
    if (!Array.isArray(data)) throw new Error("Invalid format");
    papers = data.filter(
      (i) => i && typeof i.subject === "string" && typeof i.code === "string" && i.page != null
    );
  })
  .catch(() => {
    errorMsg.textContent = "Unable to load papers index. Please try again.";
    errorMsg.hidden = false;
  });

// ---- Render ----
function renderSuggestions(query) {
  const trimmed = query.trim();
  if (!trimmed) {
    suggestionsEl.classList.remove("visible");
    return;
  }
  const matches = papers.filter((e) => matchesEntry(e, trimmed)).slice(0, MAX_SUGGESTIONS);
  if (!matches.length) {
    suggestionsEl.classList.remove("visible");
    return;
  }
  suggestionsEl.innerHTML = matches
    .map(
      (entry) =>
        `<button type="button" data-code="${entry.code}">${highlightText(
          `${entry.subject} (${entry.code}) - Page ${entry.page}`,
          trimmed
        )}</button>`
    )
    .join("");
  suggestionsEl.classList.add("visible");
}

function renderResults(query) {
  const trimmed = query.trim();
  resultsGrid.innerHTML = "";
  noResults.hidden = true;
  resultCount.hidden = true;

  if (!trimmed) return;

  const matches = papers.filter((e) => matchesEntry(e, trimmed));

  resultCount.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"} found`;
  resultCount.hidden = false;

  if (!matches.length) {
    noResults.hidden = false;
    return;
  }

  resultsGrid.innerHTML = matches
    .map(
      (entry) => `
    <article class="card">
      <p class="subject">${highlightText(entry.subject, trimmed)}</p>
      <p class="meta"><strong>Course Code:</strong> ${highlightText(entry.code, trimmed)}</p>
      <p class="meta"><strong>Page:</strong> ${entry.page}</p>
      <a class="open-btn" href="${PDF_PATH}#page=${entry.page}" target="_blank" rel="noopener noreferrer">Open Paper</a>
    </article>`
    )
    .join("");
}

// ---- Events ----
searchInput.addEventListener("input", () => {
  renderSuggestions(searchInput.value);
  renderResults(searchInput.value);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") suggestionsEl.classList.remove("visible");
});

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  suggestionsEl.classList.remove("visible");
  renderResults(searchInput.value);
});

suggestionsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  searchInput.value = btn.dataset.code;
  suggestionsEl.classList.remove("visible");
  renderResults(searchInput.value);
});

document.addEventListener("click", (e) => {
  if (!searchWrapper.contains(e.target)) {
    suggestionsEl.classList.remove("visible");
  }
});
const INDEX_PATH_CANDIDATES = [
  "/data/papers_index.json",
  "/public/data/papers_index.json",
  "./data/papers_index.json",
  "./public/data/papers_index.json",
];
const MAX_SUGGESTIONS = 6;

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const suggestionsBox = document.getElementById("suggestions");
const resultsEl = document.getElementById("results");
const resultsCountEl = document.getElementById("results-count");

let papersIndex = [];
let indexPath = INDEX_PATH_CANDIDATES[0];
let pdfPath = "/papers/papers.pdf";

function derivePdfPathFromIndexPath(path) {
  return path.replace("data/papers_index.json", "papers/papers.pdf");
}

async function resolveIndexPath() {
  for (const candidate of INDEX_PATH_CANDIDATES) {
    try {
      const res = await fetch(candidate, { cache: "no-store" });
      if (res.ok) {
        indexPath = candidate;
        pdfPath = derivePdfPathFromIndexPath(candidate);
        return res;
      }
    } catch (_error) {}
  }

  throw new Error("Unable to resolve papers index path");
}

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
      const pdfUrl = `${pdfPath}#page=${encodeURIComponent(entry.page)}`;
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
    const res = await resolveIndexPath();

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
