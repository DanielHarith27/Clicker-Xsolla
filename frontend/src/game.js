// --- CONSTANTS ---
const API_URL = "http://localhost:8080/api";
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const PASSIVE_INCOME_UPDATE_INTERVAL = 1000; // 1 second
const FLOATING_NUMBER_DURATION = 1500; // ms
const SAVE_STATUS_DISPLAY_DURATION = 2000; // ms
const PAYMENT_MODAL_DELAY = 500; // ms
const CRIT_CHANCE_CAP = 0.35;

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
  11: 299,
  12: 299,
  13: 299,
  14: 299,
  15: 299,
  16: 299,
  17: 299,
  18: 299,
  19: 299,
  20: 299,
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

let combatState = {
  enemyIndex: 0,
  enemyMaxHealth: 60,
  enemyHealth: 60,
  combo: 0,
  wins: 0,
  appliedTier: 1,
};

let autoUnlockInFlight = false;

const ENEMY_POOL = [
  { name: "Neon Thug", style: "Tier 1", baseHp: 60 },
  { name: "Arcade Ronin", style: "Tier 2", baseHp: 90 },
  { name: "Chrome Boxer", style: "Tier 3", baseHp: 130 },
  { name: "Midnight Oni", style: "Tier 4", baseHp: 180 },
  { name: "Razor Monarch", style: "Tier 5", baseHp: 240 },
];

const WEAPON_LABELS = [
  "Street Gloves",
  "Chain Whip",
  "Neon Bat",
  "Pulse Knife",
  "Shock Gauntlet",
  "Riot Hammer",
  "Phantom Blade",
  "Turbo Knuckles",
  "Rail Lance",
  "Night Fang",
];

const WEAPON_TIER_NAMES = [
  "Brawler I",
  "Brawler II",
  "Bruiser III",
  "Hunter IV",
  "Executioner V",
  "Legend VI",
];

const MILESTONE_LEVELS = [3, 5, 8, 11, 14, 18, 20];

// --- DOM ELEMENT CACHE ---
const DOM = {
  authModal: () => document.getElementById("authModal"),
  gameContainer: () => document.getElementById("gameContainer"),
  xsollaLoginBtn: () => document.getElementById("xsollaLoginBtn"),
  authHint: () => document.getElementById("authHint"),
  authError: () => document.getElementById("authError"),
  userDisplay: () => document.getElementById("userDisplay"),
  coinCount: () => document.getElementById("coinCount"),
  cpsCount: () => document.getElementById("cpsCount"),
  enemyName: () => document.getElementById("enemyName"),
  enemyTier: () => document.getElementById("enemyTier"),
  enemyHealthFill: () => document.getElementById("enemyHealthFill"),
  enemyHealthText: () => document.getElementById("enemyHealthText"),
  comboCount: () => document.getElementById("comboCount"),
  attackPower: () => document.getElementById("attackPower"),
  weaponTierLabel: () => document.getElementById("weaponTierLabel"),
  nextTierLabel: () => document.getElementById("nextTierLabel"),
  milestoneLabel: () => document.getElementById("milestoneLabel"),
  powerCurveLabel: () => document.getElementById("powerCurveLabel"),
  battleLog: () => document.getElementById("battleLog"),
  playerRank: () => document.getElementById("playerRank"),
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
  initializeCombat();
  const params = new URLSearchParams(window.location.search);
  const oauthCode = params.get("code");
  const oauthState = params.get("state");

  if (oauthCode) {
    if (DOM.authHint()) {
      DOM.authHint().textContent = "Completing Xsolla login...";
    }
    handleXsollaOAuthCallback(oauthCode, oauthState);
    setupEventListeners();
    return;
  }

  const savedToken = localStorage.getItem("token");

  if (savedToken) {
    gameState.token = savedToken;
    loadGameState();
  }

  setupEventListeners();
});

async function startXsollaLogin() {
  try {
    const data = await apiCall("/xsolla/login-url", null, "GET");
    window.location.href = data.url;
  } catch (error) {
    showAuthError(error.message || "Failed to start Xsolla login");
  }
}

async function handleXsollaOAuthCallback(code, state) {
  try {
    const data = await apiCall("/xsolla/oauth-callback", { code, state });

    gameState.token = data.token;
    gameState.userId = data.user.id;
    gameState.username = data.user.username;
    localStorage.setItem("token", data.token);

    DOM.authModal().classList.remove("active");
    DOM.gameContainer().classList.remove("hidden");
    DOM.userDisplay().textContent = data.user.username;

    window.history.replaceState({}, document.title, window.location.pathname);
    await loadGameState();
  } catch (error) {
    showAuthError(error.message || "Xsolla login failed");
  }
}

function logout() {
  localStorage.removeItem("token");
  gameState.token = null;
  gameState.coins = 0;
  gameState.coinsPerSecond = 0;

  DOM.gameContainer().classList.add("hidden");
  DOM.authModal().classList.add("active");
  DOM.authError().classList.add("hidden");
}

function showAuthError(message) {
  DOM.authError().textContent = message;
  DOM.authError().classList.remove("hidden");
}

function initializeCombat() {
  syncCombatFromProgress();
  updateCombatUI();
}

function setupEventListeners() {
  // --- Auth Button Events ---
  const xsollaLoginBtn = DOM.xsollaLoginBtn();
  if (xsollaLoginBtn) xsollaLoginBtn.addEventListener("click", startXsollaLogin);
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // --- Game Events ---
  document.getElementById("clickButton").addEventListener("click", clickCoin);
  document.getElementById("saveBtn").addEventListener("click", saveGame);

  // --- Timers ---
  setInterval(updatePassiveIncome, PASSIVE_INCOME_UPDATE_INTERVAL);
  setInterval(() => {
    if (gameState.token) saveGame();
  }, AUTO_SAVE_INTERVAL);
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
    syncCombatFromProgress();
    updateUI();
  } catch (error) {
    console.error("Error loading game state:", error);
  }
}

async function saveGame() {
  if (!gameState.token) return;

  try {
    const safeCoins = Number.isFinite(gameState.coins)
      ? Math.max(0, Math.floor(gameState.coins))
      : 0;
    const safeCps = Number.isFinite(gameState.coinsPerSecond)
      ? Math.max(0, Number(gameState.coinsPerSecond.toFixed(4)))
      : 0;
    const safeLevel = Number.isFinite(gameState.currentLevel)
      ? Math.max(1, Math.floor(gameState.currentLevel))
      : 1;

    await apiCall("/game/save", {
      coins: safeCoins,
      coins_per_second: safeCps,
      current_level: safeLevel,
    });

    // Keep local state aligned with persisted shape expected by backend.
    gameState.coins = safeCoins;
    gameState.coinsPerSecond = safeCps;
    gameState.currentLevel = safeLevel;

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
  const attackPower = calculateAttackPower();
  const critChance = Math.min(
    0.1 + gameState.currentLevel * 0.01,
    CRIT_CHANCE_CAP,
  );
  const isCritical = Math.random() < critChance;
  const critMultiplier = isCritical ? 2 : 1;
  const comboBonus = 1 + Math.min(combatState.combo * 0.06, 1.2);
  const damage = Math.max(
    1,
    Math.round(attackPower * critMultiplier * comboBonus),
  );

  combatState.enemyHealth = Math.max(0, combatState.enemyHealth - damage);
  combatState.combo += 1;

  const coinsGained = Math.max(1, Math.round(1 + damage * 0.35));
  gameState.coins += coinsGained;

  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;
  createFloatingNumber(`-${damage} HP`, x, y - 10, "damage");
  createFloatingNumber(`+${coinsGained} CR`, x, y + 22, "gain");

  if (isCritical) {
    createFloatingNumber("CRITICAL", x, y - 36, "crit");
  }

  if (combatState.enemyHealth <= 0) {
    handleEnemyDefeat(x, y);
  } else {
    setBattleLog(
      `${isCritical ? "Critical strike" : "Hit landed"} for ${damage} damage.`,
    );
  }

  updateUI();

  try {
    await apiCall("/game/click", { coins_per_click: coinsGained });
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
      `+${coinsGained.toFixed(1)} AUTO`,
      window.innerWidth / 2,
      100,
      "auto",
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

async function unlockLevelWithCoins(levelNumber, options = {}) {
  const { silent = false } = options;

  try {
    await apiCall("/game/unlock-level", { level_number: levelNumber });
    await loadGameState();
    updateUI();
  } catch (error) {
    if (!silent) {
      alert(error.message || "Cannot unlock level");
    }
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
  try {
    const tokenData = await apiCall("/xsolla/token", { level_number: levelNumber });
    const accessToken = tokenData.token;
    const isSandbox = tokenData.sandbox === true;

    DOM.paymentLoading().classList.add("hidden");

    // Load Pay Station Embed script
    if (!window.XPayStationWidget) {
      const script = document.createElement("script");
      script.src = "https://cdn.xsolla.net/payments-bucket-prod/embed/1.5.4/widget.min.js";
      script.async = true;
      script.addEventListener("load", () => {
        openXsollaPayStation(accessToken, levelNumber, isSandbox);
      });
      script.addEventListener("error", () => {
        throw new Error("Failed to load payment widget script");
      });
      document.head.appendChild(script);
    } else {
      openXsollaPayStation(accessToken, levelNumber, isSandbox);
    }
  } catch (error) {
    DOM.paymentLoading().classList.add("hidden");
    alert("Failed to open payment system: " + error.message);
    closePaymentModal();
  }
}

function openXsollaPayStation(accessToken, levelNumber, isSandbox) {
  const options = {
    access_token: accessToken,
    sandbox: isSandbox,
    locale: "en",
    lightbox: {
      width: "740px",
      height: "760px",
      spinner: "round",
      spinnerColor: "#00d4ff",
      overlayOpacity: 0.7,
      overlayBackground: "#000000",
      contentBackground: "#1a1a2e",
      modal: false,
      closeByClick: true,
      closeByKeyboard: true,
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
  const progression = getProgressionState();

  DOM.coinCount().textContent = formatNumber(gameState.coins);
  DOM.cpsCount().textContent = Number(gameState.coinsPerSecond || 0).toFixed(1);
  DOM.attackPower().textContent = formatNumber(calculateAttackPower());
  DOM.playerRank().textContent = `Street Rank ${gameState.currentLevel}`;
  updateProgressionUI(progression);
  applyTierHealthScaling(progression);
  updateCombatUI();
  updateUpgradeStore();
  updateLevelMap();
  checkLevelUnlocks();
}

function updateUpgradeStore() {
  const store = DOM.upgradeStore();
  store.innerHTML = "";

  const orderedUpgrades = [...gameState.upgrades].sort((a, b) => {
    const costA = Number(a.base_cost || 0);
    const costB = Number(b.base_cost || 0);
    if (costA !== costB) return costA - costB;
    return Number(a.id || 0) - Number(b.id || 0);
  });

  orderedUpgrades.forEach((upgrade, index) => {
    const ownedCount = upgrade.owned_count || 0;
    const maxOwnedCount = upgrade.max_owned_count || 1;
    const isMaxed = ownedCount >= maxOwnedCount;
    const cost = Math.ceil(upgrade.base_cost * Math.pow(1.15, ownedCount));
    const canAfford = gameState.coins >= cost;
    const canBuy = canAfford && !isMaxed;
    const currentAutoDamage = getUpgradeTotalAutoDamage(
      upgrade.coins_per_second_gain,
      ownedCount,
    );
    const nextAutoDamage = getUpgradeTotalAutoDamage(
      upgrade.coins_per_second_gain,
      ownedCount + 1,
    );
    const nextGain = Math.max(0, nextAutoDamage - currentAutoDamage);

    const card = document.createElement("div");
    card.className = "upgrade-card";

    // Sanitize upgrade data
    const safeName = escapeHtml(getWeaponName(upgrade, index));
    const safeDescription = escapeHtml(upgrade.description);

    card.innerHTML = `
      <div class="upgrade-header">
        <div>
          <div class="upgrade-title">${upgrade.icon || "MOD"} ${safeName}</div>
          <div class="upgrade-description">${safeDescription}</div>
        </div>
        <div class="upgrade-owned">x${ownedCount}/${maxOwnedCount}</div>
      </div>
      <div class="upgrade-cost">Cost: ${formatNumber(cost)} CR</div>
      <div class="upgrade-cps">Auto-damage: ${currentAutoDamage.toFixed(2)}/sec</div>
      <div class="upgrade-cps">Next gain: +${nextGain.toFixed(2)}/sec</div>
      <button class="btn btn-upgrade" onclick="buyUpgrade(${upgrade.id})" ${!canBuy ? "disabled" : ""}>
        ${isMaxed ? "MAXED" : "Upgrade"}
      </button>
    `;
    store.appendChild(card);
  });
}

function getUpgradeTotalAutoDamage(baseGain, ownedCount) {
  if (!ownedCount || ownedCount <= 0) return 0;
  const growthMultiplier = 1 + 0.5 * (ownedCount - 1);
  return Number(baseGain) * growthMultiplier;
}

function getWeaponName(upgrade, index) {
  void upgrade;
  return WEAPON_LABELS[index % WEAPON_LABELS.length] || "Combat Mod";
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
        <div class="level-title">District ${level.level_number}</div>
        <div class="level-status ${isUnlocked ? "" : "locked"}">${statusBadge}</div>
      </div>
      ${!isUnlocked && threshold > 0 ? `<div class="level-threshold">Unlock at: ${formatNumber(threshold)} credits</div>` : ""}
      ${actionButton}
    `;
    map.appendChild(card);
  });
}

function checkLevelUnlocks() {
  if (autoUnlockInFlight) return;

  const nextLockedLevel = [...gameState.levels]
    .filter((level) => !level.unlocked)
    .sort((a, b) => a.level_number - b.level_number)[0];

  if (!nextLockedLevel || Number(nextLockedLevel.coin_threshold) <= 0) return;
  if (gameState.coins < Number(nextLockedLevel.coin_threshold)) return;

  autoUnlockInFlight = true;
  unlockLevelWithCoins(nextLockedLevel.level_number, { silent: true })
    .then(() => {})
    .finally(() => {
      autoUnlockInFlight = false;
    });
}

// --- FLOATING NUMBERS ---
function createFloatingNumber(text, x, y, variant = "") {
  const container = DOM.floatingNumbersContainer();
  const number = document.createElement("div");
  number.className = `floating-number ${variant}`.trim();
  number.textContent = text;
  number.style.left = x + "px";
  number.style.top = y + "px";

  container.appendChild(number);

  setTimeout(() => {
    number.remove();
  }, FLOATING_NUMBER_DURATION);
}

function calculateAttackPower() {
  const progression = getProgressionState();
  const upgradePower = gameState.upgrades.reduce((sum, upgrade) => {
    const ownedCount = Number(upgrade.owned_count || 0);
    const gain = Number(upgrade.coins_per_second_gain || 0);
    return sum + ownedCount * Math.max(1, Math.round(gain * 2));
  }, 0);

  const base = 1 + Math.floor(gameState.currentLevel * 0.5);
  const passiveBoost = applySoftCap(gameState.coinsPerSecond * 0.85, 18, 15);
  const scaledUpgradePower = applySoftCap(upgradePower, 28, 24);

  return Math.max(
    1,
    base +
      passiveBoost +
      scaledUpgradePower +
      progression.milestoneDamageBonus +
      progression.tierSpikeBonus,
  );
}

function getProgressionState() {
  const totalOwnedMods = gameState.upgrades.reduce(
    (sum, upgrade) => sum + Number(upgrade.owned_count || 0),
    0,
  );

  const tierSize = 3;
  const rawTier = Math.floor(totalOwnedMods / tierSize) + 1;
  const tier = clamp(rawTier, 1, WEAPON_TIER_NAMES.length);
  const nextTierAt = tier * tierSize;
  const modsToNextTier = Math.max(0, nextTierAt - totalOwnedMods);

  const milestoneCount = MILESTONE_LEVELS.filter(
    (level) => gameState.currentLevel >= level,
  ).length;
  const milestoneDamageBonus = milestoneCount * 2;
  const tierSpikeBonus = (tier - 1) * 3;

  return {
    tier,
    tierName: WEAPON_TIER_NAMES[tier - 1] || "Brawler I",
    modsToNextTier,
    milestoneCount,
    milestoneDamageBonus,
    tierSpikeBonus,
  };
}

function updateProgressionUI(progression) {
  DOM.weaponTierLabel().textContent = progression.tierName;

  DOM.nextTierLabel().textContent =
    progression.modsToNextTier > 0
      ? `${progression.modsToNextTier} mods`
      : "Tier maxed";

  DOM.milestoneLabel().textContent = `+${progression.milestoneDamageBonus} dmg`;

  const curveText =
    progression.modsToNextTier <= 1
      ? "Power spike incoming"
      : progression.milestoneCount > 0
        ? "Milestone pacing active"
        : "Build your first spike";

  DOM.powerCurveLabel().textContent = curveText;
}

function applySoftCap(value, cap, rate) {
  if (value <= 0) return 0;
  return Math.round(cap * (1 - Math.exp(-value / rate)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function syncCombatFromProgress() {
  const progression = getProgressionState();
  const levelBias = Math.max(0, gameState.currentLevel - 1);
  const winsBias = Math.floor(gameState.coins / 300);
  combatState.enemyIndex = (levelBias + winsBias) % ENEMY_POOL.length;
  const enemy = ENEMY_POOL[combatState.enemyIndex];
  const hpScale = (1 + levelBias * 0.22 + winsBias * 0.08) * getEnemyHealthScaling(progression);
  combatState.enemyMaxHealth = Math.floor(enemy.baseHp * hpScale);
  combatState.enemyHealth = combatState.enemyMaxHealth;
  combatState.combo = 0;
  combatState.appliedTier = progression.tier;
}

function handleEnemyDefeat(x, y) {
  combatState.wins += 1;
  const bonus = Math.max(5, Math.round(combatState.enemyMaxHealth * 0.18));
  gameState.coins += bonus;
  createFloatingNumber(`+${bonus} KO BONUS`, x, y - 54, "ko");
  setBattleLog(`KO! Bonus ${bonus} credits. A new challenger enters.`);
  spawnNextEnemy();
}

function spawnNextEnemy() {
  const progression = getProgressionState();
  combatState.combo = 0;
  combatState.enemyIndex = (combatState.enemyIndex + 1) % ENEMY_POOL.length;
  const enemy = ENEMY_POOL[combatState.enemyIndex];
  const difficultyMultiplier =
    (1 + gameState.currentLevel * 0.15 + combatState.wins * 0.08) * getEnemyHealthScaling(progression);

  combatState.enemyMaxHealth = Math.floor(enemy.baseHp * difficultyMultiplier);
  combatState.enemyHealth = combatState.enemyMaxHealth;
  combatState.appliedTier = progression.tier;
  updateCombatUI();
}

function applyTierHealthScaling(progression) {
  if (combatState.appliedTier === progression.tier) return;

  const previousMax = Math.max(1, combatState.enemyMaxHealth);
  const currentRatio = Math.max(0, combatState.enemyHealth / previousMax);
  const tierDelta = progression.tier - combatState.appliedTier;
  const tierFactor = 1 + tierDelta * 0.22;

  combatState.enemyMaxHealth = Math.max(
    1,
    Math.floor(combatState.enemyMaxHealth * tierFactor),
  );
  combatState.enemyHealth = Math.max(
    1,
    Math.floor(combatState.enemyMaxHealth * currentRatio),
  );
  combatState.appliedTier = progression.tier;
}

function getEnemyHealthScaling(progression) {
  const tierFactor = 1 + Math.max(0, progression.tier - 1) * 0.2;
  const milestoneFactor = 1 + progression.milestoneCount * 0.06;
  return tierFactor * milestoneFactor;
}

function updateCombatUI() {
  const enemy = ENEMY_POOL[combatState.enemyIndex];
  const healthPercent =
    combatState.enemyMaxHealth > 0
      ? (combatState.enemyHealth / combatState.enemyMaxHealth) * 100
      : 0;

  DOM.enemyName().textContent = enemy.name;
  DOM.enemyTier().textContent = enemy.style;
  DOM.enemyHealthFill().style.width = `${Math.max(0, healthPercent)}%`;
  DOM.enemyHealthText().textContent = `${formatNumber(combatState.enemyHealth)} / ${formatNumber(combatState.enemyMaxHealth)}`;
  DOM.comboCount().textContent = `x${combatState.combo}`;
}

function setBattleLog(text) {
  DOM.battleLog().textContent = text;
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
