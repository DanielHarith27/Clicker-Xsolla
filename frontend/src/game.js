// --- CONSTANTS ---
const API_URL = "http://localhost:8080/api";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const PASSIVE_INCOME_UPDATE_INTERVAL = 1000; // 1 second
const FLOATING_NUMBER_DURATION = 1500; // ms
const SAVE_STATUS_DISPLAY_DURATION = 2000; // ms
const PAYMENT_MODAL_DELAY = 500; // ms

// Level prices in cents (synchronized with backend)
const LEVEL_PRICES = {
  2: 299,
  3: 299,
  4: 299,
  5: 299,
  6: 299,
  7: 299,
  8: 299,
  9: 299,
  10: 299,
};

// --- GAME STATE ---
let gameState = {
  coins: 0,
  coinsPerSecond: 0,
  currentLevel: 1,
  token: null,
  userId: null,
  username: null,
  upgrades: [],
  levels: [],
  lastSaveTime: Date.now(),
  lastUpdateTime: Date.now(),
};

// --- DOM ELEMENT CACHE ---
const DOM = {
  authModal: () => document.getElementById("authModal"),
  gameContainer: () => document.getElementById("gameContainer"),
  loginForm: () => document.getElementById("loginForm"),
  signupForm: () => document.getElementById("signupForm"),
  authError: () => document.getElementById("authError"),
  userDisplay: () => document.getElementById("userDisplay"),
  coinCount: () => document.getElementById("coinCount"),
  cpsCount: () => document.getElementById("cpsCount"),
  upgradeStore: () => document.getElementById("upgradeStore"),
  levelMap: () => document.getElementById("levelMap"),
  autoSaveInfo: () => document.getElementById("autoSaveInfo"),
  paymentModal: () => document.getElementById("paymentModal"),
  paymentLevelNumber: () => document.getElementById("paymentLevelNumber"),
  paymentLoading: () => document.getElementById("paymentLoading"),
  xsollaPaymentContainer: () =>
    document.getElementById("xsollaPaymentContainer"),
  floatingNumbersContainer: () =>
    document.getElementById("floatingNumbersContainer"),
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  const savedToken = localStorage.getItem("token");
  if (savedToken) {
    gameState.token = savedToken;
    loadGameState();
  }
  setupEventListeners();
});

function setupEventListeners() {
  // --- Auth Button Events ---
  document.getElementById("loginBtn").addEventListener("click", login);
  document.getElementById("signupBtn").addEventListener("click", signup);
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // --- Game Events ---
  document.getElementById("clickButton").addEventListener("click", clickCoin);
  document.getElementById("saveBtn").addEventListener("click", saveGame);

  // --- Auth Form Enter Key (consolidated) ---
  const authEnterHandler = (callback) => (e) => {
    if (e.key === "Enter") callback();
  };
  document
    .getElementById("loginUsername")
    .addEventListener("keypress", authEnterHandler(login));
  document
    .getElementById("loginPassword")
    .addEventListener("keypress", authEnterHandler(login));
  document
    .getElementById("signupUsername")
    .addEventListener("keypress", authEnterHandler(signup));
  document
    .getElementById("signupEmail")
    .addEventListener("keypress", authEnterHandler(signup));
  document
    .getElementById("signupPassword")
    .addEventListener("keypress", authEnterHandler(signup));

  // --- Timers ---
  setInterval(updatePassiveIncome, PASSIVE_INCOME_UPDATE_INTERVAL);
  setInterval(() => {
    if (gameState.token) saveGame();
  }, AUTO_SAVE_INTERVAL);
}

// --- AUTHENTICATION ---
function switchForm() {
  DOM.loginForm().classList.toggle("active");
  DOM.signupForm().classList.toggle("active");
}

async function login() {
  const username = document.getElementById("loginUsername").value;
  const password = document.getElementById("loginPassword").value;

  if (!username || !password) {
    showAuthError("Please fill in all fields");
    return;
  }

  try {
    const data = await apiCall("/auth/login", { username, password });

    gameState.token = data.token;
    gameState.userId = data.user.id;
    gameState.username = data.user.username;
    localStorage.setItem("token", data.token);

    DOM.authModal().classList.remove("active");
    DOM.gameContainer().classList.remove("hidden");
    DOM.userDisplay().textContent = data.user.username;

    loadGameState();
  } catch (error) {
    showAuthError(error.message || "Login failed");
  }
}

async function signup() {
  const username = document.getElementById("signupUsername").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;

  if (!username || !email || !password) {
    showAuthError("Please fill in all fields");
    return;
  }

  try {
    const data = await apiCall("/auth/register", { username, email, password });

    gameState.token = data.token;
    gameState.userId = data.user.id;
    gameState.username = data.user.username;
    localStorage.setItem("token", data.token);

    DOM.authModal().classList.remove("active");
    DOM.gameContainer().classList.remove("hidden");
    DOM.userDisplay().textContent = data.user.username;

    loadGameState();
  } catch (error) {
    showAuthError(error.message || "Signup failed");
  }
}

function logout() {
  localStorage.removeItem("token");
  gameState.token = null;
  gameState.coins = 0;
  gameState.coinsPerSecond = 0;

  DOM.gameContainer().classList.add("hidden");
  DOM.authModal().classList.add("active");
  DOM.loginForm().classList.add("active");
  DOM.signupForm().classList.remove("active");
  DOM.authError().classList.add("hidden");

  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
}

function showAuthError(message) {
  DOM.authError().textContent = message;
  DOM.authError().classList.remove("hidden");
}

// --- API UTILITIES ---
async function apiCall(endpoint, body = null, method = "POST") {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (gameState.token) {
    options.headers["Authorization"] = `Bearer ${gameState.token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

// --- GAME STATE MANAGEMENT ---
async function loadGameState() {
  try {
    const data = await apiCall("/game/state", null, "GET");
    gameState.coins = Number(data.coins ?? 0);
    gameState.coinsPerSecond = Number(
      data.coins_per_second ?? data.coinsPerSecond ?? 0,
    );
    gameState.currentLevel = Number(data.current_level ?? data.currentLevel ?? 1);
    gameState.upgrades = Array.isArray(data.upgrades) ? data.upgrades : [];
    gameState.levels = Array.isArray(data.levels) ? data.levels : [];
    updateUI();
  } catch (error) {
    console.error("Error loading game state:", error);
  }
}

async function saveGame() {
  if (!gameState.token) return;

  try {
    await apiCall("/game/save", {
      coins: gameState.coins,
      coins_per_second: gameState.coinsPerSecond,
      current_level: gameState.currentLevel,
    });

    gameState.lastSaveTime = Date.now();
    DOM.autoSaveInfo().textContent = "Saved!";
    setTimeout(() => {
      DOM.autoSaveInfo().textContent = "Auto-saving...";
    }, SAVE_STATUS_DISPLAY_DURATION);
  } catch (error) {
    console.error("Error saving game:", error);
  }
}

// --- GAMEPLAY ---
async function clickCoin(event) {
  gameState.coins += 1;
  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;
  createFloatingNumber("+1", x, y);
  updateUI();

  try {
    await apiCall("/game/click", { coins_per_click: 1 });
  } catch (error) {
    console.error("Click error:", error);
  }
}

function updatePassiveIncome() {
  const now = Date.now();
  const secondsPassed = (now - gameState.lastUpdateTime) / 1000;
  gameState.lastUpdateTime = now;

  const coinsGained = gameState.coinsPerSecond * secondsPassed;
  gameState.coins += coinsGained;

  if (coinsGained > 0) {
    createFloatingNumber(
      `+${coinsGained.toFixed(1)}`,
      window.innerWidth / 2,
      100,
    );
  }

  updateUI();

  if (Math.floor(secondsPassed) > 0) {
    apiCall("/game/update-coins", {
      seconds_passed: Math.floor(secondsPassed),
    }).catch((error) => console.error("Update coins error:", error));
  }
}

async function buyUpgrade(upgradeId) {
  try {
    const data = await apiCall("/game/buy-upgrade", { upgrade_id: upgradeId });
    gameState.coins = data.coins;
    gameState.coinsPerSecond = Number(data.coins_per_second ?? 0);
    await loadGameState();
    updateUI();
  } catch (error) {
    alert(error.message || "Cannot buy upgrade");
  }
}

async function unlockLevelWithCoins(levelNumber) {
  try {
    await apiCall("/game/unlock-level", { level_number: levelNumber });
    await loadGameState();
    updateUI();
  } catch (error) {
    alert(error.message || "Cannot unlock level");
  }
}

// --- PAYMENT SYSTEM ---
function openPaymentModal(levelNumber) {
  DOM.paymentModal().classList.add("active");
  DOM.paymentLevelNumber().textContent = levelNumber;
  DOM.paymentLoading().classList.remove("hidden");
  DOM.xsollaPaymentContainer().innerHTML = "";

  setTimeout(() => {
    initializeXsollaPayment(levelNumber);
  }, PAYMENT_MODAL_DELAY);
}

function closePaymentModal() {
  DOM.paymentModal().classList.remove("active");
  DOM.xsollaPaymentContainer().innerHTML = "";
}

async function initializeXsollaPayment(levelNumber) {
  const price = LEVEL_PRICES[levelNumber] || 299;

  try {
    const tokenData = await apiCall("/xsolla/token", { level_number: levelNumber });
    const accessToken = tokenData.token;

    DOM.paymentLoading().classList.add("hidden");

    if (!window.XPayStationWidget) {
      throw new Error("Payment system is unavailable. Please try again later.");
    }

    const options = {
      access_token: accessToken,
      sandbox: true,
      lightbox: {
        width: "740px",
        height: "760px",
        spinner: "round",
        spinnerColor: "#00d4ff",
        overlayOpacity: 0.7,
        overlayBackground: "#000000",
        contentBackground: "#1a1a2e",
      },
    };

    window.XPayStationWidget.on(
      window.XPayStationWidget.eventTypes.STATUS,
      function (event, data) {
        if (data.status === "done") {
          handlePaymentSuccess(data, levelNumber);
        }
      },
    );

    window.XPayStationWidget.on(
      window.XPayStationWidget.eventTypes.CLOSE,
      function () {
        closePaymentModal();
      },
    );

    window.XPayStationWidget.on(
      window.XPayStationWidget.eventTypes.ERROR,
      function (event, data) {
        handlePaymentError(data);
      },
    );

    window.XPayStationWidget.init(options);
    window.XPayStationWidget.open();
  } catch (error) {
    DOM.paymentLoading().classList.add("hidden");
    alert("Failed to open payment system: " + error.message);
  }
}

async function handlePaymentSuccess(transaction, levelNumber) {
  try {
    const transactionId =
      transaction.transaction_id ||
      transaction.invoice ||
      "local_" + Date.now();
    const amountCents = LEVEL_PRICES[levelNumber];

    await apiCall("/game/unlock-level-payment", {
      level_number: levelNumber,
      xsolla_payment_id: transactionId,
      amount_cents: amountCents,
    });

    alert(
      "🎉 Level " + levelNumber + " unlocked! Thank you for your purchase!",
    );
    closePaymentModal();
    await loadGameState();
    updateUI();
  } catch (error) {
    console.error("Payment success handling error:", error);
    alert("Level unlocked! (Local error handling)");
    closePaymentModal();
  }
}

function handlePaymentError(error) {
  alert("Payment failed. Please try again. Error: " + (error.message || error));
  closePaymentModal();
}

// --- UI UPDATES ---
function updateUI() {
  DOM.coinCount().textContent = formatNumber(gameState.coins);
  DOM.cpsCount().textContent = Number(gameState.coinsPerSecond || 0).toFixed(1);
  updateUpgradeStore();
  updateLevelMap();
  checkLevelUnlocks();
}

function updateUpgradeStore() {
  const store = DOM.upgradeStore();
  store.innerHTML = "";

  gameState.upgrades.forEach((upgrade) => {
    const ownedCount = upgrade.owned_count || 0;
    const cost = Math.ceil(upgrade.base_cost * Math.pow(1.15, ownedCount));
    const canAfford = gameState.coins >= cost;

    const card = document.createElement("div");
    card.className = "upgrade-card";

    // Sanitize upgrade data
    const safeName = escapeHtml(upgrade.name);
    const safeDescription = escapeHtml(upgrade.description);

    card.innerHTML = `
      <div class="upgrade-header">
        <div>
          <div class="upgrade-title">${upgrade.icon} ${safeName}</div>
          <div class="upgrade-description">${safeDescription}</div>
        </div>
        <div class="upgrade-owned">x${ownedCount}</div>
      </div>
      <div class="upgrade-cost">Cost: ${formatNumber(cost)} 🪙</div>
      <div class="upgrade-cps">+${upgrade.coins_per_second_gain.toFixed(1)}/sec</div>
      <button class="btn btn-upgrade" onclick="buyUpgrade(${upgrade.id})" ${!canAfford ? "disabled" : ""}>
        Buy
      </button>
    `;
    store.appendChild(card);
  });
}

function updateLevelMap() {
  const map = DOM.levelMap();
  map.innerHTML = "";

  gameState.levels.forEach((level) => {
    const isUnlocked = level.unlocked;
    const card = document.createElement("div");
    card.className = `level-card ${isUnlocked ? "unlocked" : ""}`;

    const threshold = level.coin_threshold;
    const canUnlockWithCoins =
      gameState.coins >= threshold && !isUnlocked && threshold > 0;

    let statusBadge = "Unlocked ✓";
    let actionButton = "";

    if (!isUnlocked) {
      statusBadge = "Locked 🔒";
      actionButton = `
        <button class="btn btn-level" onclick="unlockLevelWithCoins(${level.level_number})" ${!canUnlockWithCoins ? "disabled" : ""}>
          ${threshold > 0 ? `Unlock (${formatNumber(threshold)} coins)` : "Unlock"}
        </button>
        <button class="btn btn-level" onclick="openPaymentModal(${level.level_number})">
          Pay to Unlock ($${(LEVEL_PRICES[level.level_number] || 299) / 100})
        </button>
      `;
    }

    card.innerHTML = `
      <div class="level-header">
        <div class="level-title">Level ${level.level_number}</div>
        <div class="level-status ${isUnlocked ? "" : "locked"}">${statusBadge}</div>
      </div>
      ${!isUnlocked && threshold > 0 ? `<div class="level-threshold">Unlock at: ${formatNumber(threshold)} coins</div>` : ""}
      ${actionButton}
    `;
    map.appendChild(card);
  });
}

function checkLevelUnlocks() {
  gameState.levels.forEach((level) => {
    if (
      !level.unlocked &&
      level.coin_threshold > 0 &&
      gameState.coins >= level.coin_threshold
    ) {
      unlockLevelWithCoins(level.level_number).then(() => {
        alert(`🎉 Level ${level.level_number} unlocked!`);
      });
    }
  });
}

// --- FLOATING NUMBERS ---
function createFloatingNumber(text, x, y) {
  const container = DOM.floatingNumbersContainer();
  const number = document.createElement("div");
  number.className = "floating-number";
  number.textContent = text;
  number.style.left = x + "px";
  number.style.top = y + "px";

  container.appendChild(number);

  setTimeout(() => {
    number.remove();
  }, FLOATING_NUMBER_DURATION);
}

// --- UTILITIES ---
function formatNumber(num) {
  if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + "T";
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(2) + "K";
  return Math.floor(num).toString();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
