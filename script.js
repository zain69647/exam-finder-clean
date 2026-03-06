const INDEX_PATH = "public/data/papers_index.json";
const PDF_PATH = "public/papers/papers.pdf";
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
