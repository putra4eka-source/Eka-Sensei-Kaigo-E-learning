// ==========================================
// SRS ENGINE (SM-2 simplified)
// ==========================================

const SRS_KEY = "kaigo_srs_data";
const STATS_KEY = "kaigo_stats";
const SESSION_KEY = "kaigo_session";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function loadSRS() {
  try { return JSON.parse(localStorage.getItem(SRS_KEY)) || {}; }
  catch { return {}; }
}

function saveSRS(data) {
  localStorage.setItem(SRS_KEY, JSON.stringify(data));
}

function loadStats() {
  try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { streak: 0, lastStudy: "", totalReviewed: 0 }; }
  catch { return { streak: 0, lastStudy: "", totalReviewed: 0 }; }
}

function saveStats(s) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

function getCardData(id) {
  const srs = loadSRS();
  return srs[id] || { id, interval: 0, easeFactor: 2.5, dueDate: todayStr(), reviewCount: 0, lapses: 0 };
}

// rating: 0=susah, 1=agak lupa, 2=ingat, 3=sangat mudah
function scheduleCard(id, rating) {
  const card = getCardData(id);
  const srs = loadSRS();

  if (rating === 0) {
    // Susah - reset, muncul lagi segera (10 menit = simulasikan hari ini)
    card.interval = 0;
    card.lapses++;
    card.dueDate = todayStr();
  } else if (rating === 1) {
    // Agak lupa
    card.interval = Math.max(1, Math.ceil(card.interval * 1.2));
    card.dueDate = addDays(todayStr(), card.interval);
  } else if (rating === 2) {
    // Ingat
    if (card.interval === 0) card.interval = 1;
    else card.interval = Math.ceil(card.interval * card.easeFactor);
    card.easeFactor = Math.max(1.3, card.easeFactor + 0.1);
    card.dueDate = addDays(todayStr(), card.interval);
  } else {
    // Sangat mudah
    if (card.interval === 0) card.interval = 7;
    else card.interval = Math.ceil(card.interval * 3);
    card.easeFactor = Math.min(3.0, card.easeFactor + 0.2);
    card.dueDate = addDays(todayStr(), card.interval);
  }

  card.reviewCount++;
  srs[id] = card;
  saveSRS(srs);
  updateStreak();
}

function updateStreak() {
  const stats = loadStats();
  const today = todayStr();
  if (stats.lastStudy === today) return;
  const yesterday = addDays(today, -1);
  if (stats.lastStudy === yesterday) {
    stats.streak++;
  } else if (stats.lastStudy !== today) {
    stats.streak = 1;
  }
  stats.lastStudy = today;
  stats.totalReviewed++;
  saveStats(stats);
}

function getDueCards(kategori) {
  const srs = loadSRS();
  const today = todayStr();
  return VOCABULARY.filter(v => {
    if (kategori && v.kategori !== kategori) return false;
    const card = srs[v.id];
    if (!card) return false;
    // interval=0 (難しい) → muncul lagi hari ini
    return card.dueDate <= today;
  });
}

function getNewCards(kategori, limit = 10) {
  const srs = loadSRS();
  const newCards = VOCABULARY.filter(v => {
    if (kategori && v.kategori !== kategori) return false;
    return !srs[v.id]; // hanya yang belum pernah dilihat sama sekali
  });
  return newCards.slice(0, limit);
}

function getSessionCards(kategori) {
  const due = getDueCards(kategori);
  const newCards = getNewCards(kategori, Math.max(0, 10 - due.length));
  // Shuffle
  const all = [...due, ...newCards];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// Stats per kategori
function getKategoriProgress(kategori) {
  const srs = loadSRS();
  let newCount = 0, learningCount = 0, masteredCount = 0;

  VOCABULARY.filter(v => v.kategori === kategori).forEach(v => {
    const card = srs[v.id];
    if (!card) {
      newCount++;
    } else if (card.interval > 21) {
      masteredCount++;
    } else {
      learningCount++; // interval=0 (難しい) juga masuk learning
    }
  });

  return { newCount, learningCount, masteredCount };
}

function getTodayDueCount() {
  const srs = loadSRS();
  const today = todayStr();
  return VOCABULARY.filter(v => {
    const card = srs[v.id];
    return card && card.dueDate <= today;
  }).length;
}

function getTotalLearned() {
  // Kartu yang sudah pernah dilihat (ada di SRS)
  const srs = loadSRS();
  return Object.keys(srs).length;
}

function getTotalMastered() {
  const srs = loadSRS();
  return Object.values(srs).filter(c => c.interval > 21).length;
}

// ==========================================
// AUDIO
// ==========================================

// --- BGM (home page) ---
let bgm = null;

function initBGM() {
  bgm = new Audio("home-page-music.mp3");
  bgm.loop = true;
  bgm.volume = 0.4;
}

function playBGM() {
  if (!bgm) initBGM();
  bgm.currentTime = 0;
  bgm.play().catch(() => {});
}

function stopBGM() {
  if (!bgm) return;
  bgm.pause();
  bgm.currentTime = 0;
}

// --- SFX tombol ---
let sfx = null;
let sfxFlip = null;

function initAudio() {
  sfx = new Audio("click-button.wav");
  sfx.volume = 0.7;
  sfxFlip = new Audio("flip-sound.wav");
  sfxFlip.volume = 0.8;
}

function playClick() {
  if (!sfx) return;
  sfx.currentTime = 0;
  sfx.play().catch(() => {});
}

function playFlip() {
  if (!sfxFlip) return;
  sfxFlip.currentTime = 0;
  sfxFlip.play().catch(() => {});
}

// ==========================================
// SESSION STATE
// ==========================================
let currentSession = { cards: [], index: 0, kategori: null };

function startSession(kategori) {
  currentSession.cards = getSessionCards(kategori);
  currentSession.index = 0;
  currentSession.kategori = kategori;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
}

function loadSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    if (s) currentSession = s;
  } catch {}
}

function getCurrentCard() {
  return currentSession.cards[currentSession.index] || null;
}

function nextCard() {
  currentSession.index++;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
}

function isSessionDone() {
  return currentSession.index >= currentSession.cards.length;
}

// ==========================================
// NAVIGATION
// ==========================================
function navigate(page, params = {}) {
  playClick();
  const query = new URLSearchParams(params).toString();
  window.location.href = query ? `${page}?${query}` : page;
}

function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}
