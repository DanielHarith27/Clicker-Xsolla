const API_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:8080/api"
    : `${window.location.origin}/api`;

const AUTO_SAVE_INTERVAL = 30000;
const PASSIVE_INCOME_UPDATE_INTERVAL = 1000;
const FLOATING_NUMBER_DURATION = 1500;
const SAVE_STATUS_DISPLAY_DURATION = 2000;
const PAYMENT_MODAL_DELAY = 500;
const CRIT_CHANCE_CAP = 0.35;
const DISTRICT_HP_MULTIPLIER = 2.2;
const DISTRICT_TIME_LIMIT = 30;

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

const DISTRICT_STORY = [
  {
    level: 1,
    title: "Byte Bazaar",
    intro: "Street punks are extorting local merchants. Clear the lane before midnight.",
    objective: "Defeat 2 scouts and the Bazaar Boss before time runs out.",
    rewardText: "Unlock District 2 route and earn a mission bonus.",
    enemyPool: ["Signal Thief", "Cable Bruiser", "Neon Scout"],
    bossName: "Bazaar Warden",
    timeLimit: DISTRICT_TIME_LIMIT,
    waves: 3,
  },
  {
    level: 2,
    title: "Chrome Bridge",
    intro: "Bridge gangs block power deliveries to the lower blocks.",
    objective: "Cut through bridge enforcers and take down the toll captain.",
    rewardText: "Earn boosted credits and secure bridge access.",
    enemyPool: ["Bridge Rusher", "Chrome Lancer", "Debt Collector"],
    bossName: "Captain Rivet",
    timeLimit: DISTRICT_TIME_LIMIT,
    waves: 3,
  },
  {
    level: 3,
    title: "Pulse Harbor",
    intro: "Smugglers rerouted weapon crates through the harbor cranes.",
    objective: "Clear harbor watch and beat the dock boss quickly.",
    rewardText: "Harbor intel reveals black market upgrades.",
    enemyPool: ["Dock Runner", "Harbor Tactician", "Crate Breaker"],
    bossName: "Harbor Tyrant",
    timeLimit: DISTRICT_TIME_LIMIT,
    waves: 4,
  },
  {
    level: 4,
    title: "Echo Heights",
    intro: "A rooftop syndicate is jamming district communications.",
    objective: "Climb the rooftops, break relay guards, defeat the jammer chief.",
    rewardText: "Comms restored. Route to next district opens.",
    enemyPool: ["Relay Sniper", "Skyline Brawler", "Echo Hunter"],
    bossName: "Jammer Chief",
    timeLimit: DISTRICT_TIME_LIMIT,
    waves: 4,
  },
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
  enemyName: "Choose district",
  enemyTier: "Awaiting mission",
  enemyMaxHealth: 1,
  enemyHealth: 1,
  combo: 0,
  appliedTier: 1,
};

let storyState = {
  activeView: "home",
  selectedDistrictLevel: 1,
  completedDistricts: new Set(),
  activeRun: null,
  lastClearedDistrictLevel: null,
};

let autoUnlockInFlight = false;

const DOM = {
  authModal: () => document.getElementById("authModal"),
  gameContainer: () => document.getElementById("gameContainer"),
  xsollaLoginBtn: () => document.getElementById("xsollaLoginBtn"),
  authHint: () => document.getElementById("authHint"),
  authError: () => document.getElementById("authError"),
  userDisplay: () => document.getElementById("userDisplay"),
  playerRank: () => document.getElementById("playerRank"),
  coinCount: () => document.getElementById("coinCount"),
  cpsCount: () => document.getElementById("cpsCount"),
  attackPower: () => document.getElementById("attackPower"),
  comboCount: () => document.getElementById("comboCount"),
  weaponTierLabel: () => document.getElementById("weaponTierLabel"),
  nextTierLabel: () => document.getElementById("nextTierLabel"),
  milestoneLabel: () => document.getElementById("milestoneLabel"),
  powerCurveLabel: () => document.getElementById("powerCurveLabel"),
  homeStoryText: () => document.getElementById("homeStoryText"),
  homeCurrentMission: () => document.getElementById("homeCurrentMission"),
  homeProgress: () => document.getElementById("homeProgress"),
  homeDistrictRoadmap: () => document.getElementById("homeDistrictRoadmap"),
  districtTitle: () => document.getElementById("districtTitle"),
  districtStoryText: () => document.getElementById("districtStoryText"),
  districtObjectiveText: () => document.getElementById("districtObjectiveText"),
  districtRewardText: () => document.getElementById("districtRewardText"),
  missionTimer: () => document.getElementById("missionTimer"),
  waveLabel: () => document.getElementById("waveLabel"),
  runStatusLabel: () => document.getElementById("runStatusLabel"),
  enemyName: () => document.getElementById("enemyName"),
  enemyTier: () => document.getElementById("enemyTier"),
  enemyHealthFill: () => document.getElementById("enemyHealthFill"),
  enemyHealthText: () => document.getElementById("enemyHealthText"),
  battleLog: () => document.getElementById("battleLog"),
  playerRoleText: () => document.getElementById("playerRoleText"),
  startRunBtn: () => document.getElementById("startRunBtn"),
  retreatBtn: () => document.getElementById("retreatBtn"),
  clickButton: () => document.getElementById("clickButton"),
  upgradeStore: () => document.getElementById("upgradeStore"),
  levelMap: () => document.getElementById("levelMap"),
  autoSaveInfo: () => document.getElementById("autoSaveInfo"),
  floatingNumbersContainer: () => document.getElementById("floatingNumbersContainer"),
  paymentModal: () => document.getElementById("paymentModal"),
  paymentLevelNumber: () => document.getElementById("paymentLevelNumber"),
  paymentLoading: () => document.getElementById("paymentLoading"),
  xsollaPaymentContainer: () => document.getElementById("xsollaPaymentContainer"),
  districtClearModal: () => document.getElementById("districtClearModal"),
  clearDistrictLabel: () => document.getElementById("clearDistrictLabel"),
  clearBonusLabel: () => document.getElementById("clearBonusLabel"),
  clearHomeBtn: () => document.getElementById("clearHomeBtn"),
  clearNextBtn: () => document.getElementById("clearNextBtn"),
};

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const oauthCode = params.get("code");
  const oauthState = params.get("state");

  gameState.username = localStorage.getItem("username") || "Runner";
  DOM.userDisplay().textContent = gameState.username;

  setupEventListeners();

  if (oauthCode) {
    DOM.authHint().textContent = "Completing Xsolla login...";
    handleXsollaOAuthCallback(oauthCode, oauthState);
    return;
  }

  const savedToken = localStorage.getItem("token");
  if (savedToken) {
    gameState.token = savedToken;
    showGameContainer();
    loadGameState();
  }
});

function setupEventListeners() {
  const loginBtn = DOM.xsollaLoginBtn();
  if (loginBtn) loginBtn.addEventListener("click", startXsollaLogin);

  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("saveBtn").addEventListener("click", saveGame);
  DOM.clickButton().addEventListener("click", clickCoin);
  DOM.startRunBtn().addEventListener("click", startSelectedDistrictRun);
  DOM.retreatBtn().addEventListener("click", retreatFromRun);

  document.getElementById("navHomeBtn").addEventListener("click", () => switchView("home"));
  document.getElementById("navStoreBtn").addEventListener("click", () => switchView("store"));
  document.getElementById("navDistrictsBtn").addEventListener("click", () => switchView("districts"));
  document.getElementById("homePlayBtn").addEventListener("click", () => startAdventure());
  document.getElementById("homeStoreBtn").addEventListener("click", () => switchView("store"));
  document.getElementById("homeDistrictBtn").addEventListener("click", () => switchView("districts"));
  DOM.clearHomeBtn().addEventListener("click", () => {
    hideDistrictClearModal();
    switchView("home");
  });
  DOM.clearNextBtn().addEventListener("click", () => {
    continueToNextDistrict();
  });

  setInterval(updatePassiveIncome, PASSIVE_INCOME_UPDATE_INTERVAL);
  setInterval(() => {
    if (gameState.token) saveGame();
  }, AUTO_SAVE_INTERVAL);
}

function showGameContainer() {
  DOM.authModal().classList.remove("active");
  DOM.gameContainer().classList.remove("hidden");
}

function showAuthError(message) {
  DOM.authError().textContent = message;
  DOM.authError().classList.remove("hidden");
}

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
    gameState.userId = data.user?.id || null;
    gameState.username = data.user?.username || "Runner";

    localStorage.setItem("token", data.token);
    localStorage.setItem("username", gameState.username);
    DOM.userDisplay().textContent = gameState.username;

    showGameContainer();
    window.history.replaceState({}, document.title, window.location.pathname);

    await loadGameState();
  } catch (error) {
    showAuthError(error.message || "Xsolla login failed");
  }
}

function logout() {
  stopRunTimer();
  hideDistrictClearModal();
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  gameState.token = null;
  gameState.coins = 0;
  gameState.coinsPerSecond = 0;
  gameState.currentLevel = 1;
  gameState.levels = [];
  gameState.upgrades = [];
  storyState.completedDistricts.clear();
  storyState.activeRun = null;
  storyState.lastClearedDistrictLevel = null;

  DOM.gameContainer().classList.add("hidden");
  DOM.authModal().classList.add("active");
  DOM.authError().classList.add("hidden");
}

async function apiCall(endpoint, body = null, method = "POST") {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };

  if (gameState.token) {
    options.headers.Authorization = `Bearer ${gameState.token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

async function loadGameState() {
  try {
    const data = await apiCall("/game/state", null, "GET");
    gameState.coins = Number(data.coins ?? 0);
    gameState.coinsPerSecond = Number(data.coins_per_second ?? data.coinsPerSecond ?? 0);
    gameState.currentLevel = Number(data.current_level ?? data.currentLevel ?? 1);
    gameState.upgrades = Array.isArray(data.upgrades) ? data.upgrades : [];
    gameState.levels = Array.isArray(data.levels) ? data.levels : [];
    gameState.lastUpdateTime = Date.now();

    loadCompletedDistricts();
    ensureSelectedDistrict();
    syncCombatFromDistrictSelection();
    updateUI();
    switchView("home");
  } catch (error) {
    console.error("Error loading game state:", error);
    showAuthError("Session expired. Please login again.");
    logout();
  }
}

async function saveGame() {
  if (!gameState.token) return;

  try {
    const safeCoins = Number.isFinite(gameState.coins) ? Math.max(0, Math.floor(gameState.coins)) : 0;
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

    gameState.coins = safeCoins;
    gameState.coinsPerSecond = safeCps;
    gameState.currentLevel = safeLevel;

    DOM.autoSaveInfo().textContent = "Saved!";
    setTimeout(() => {
      DOM.autoSaveInfo().textContent = "Auto-saving...";
    }, SAVE_STATUS_DISPLAY_DURATION);
  } catch (error) {
    console.error("Error saving game:", error);
  }
}

function switchView(viewName) {
  storyState.activeView = viewName;
  const map = {
    home: "homeView",
    play: "playView",
    store: "storeView",
    districts: "districtsView",
  };

  Object.values(map).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
    el.classList.remove("active-view");
  });

  const target = document.getElementById(map[viewName]);
  if (target) {
    target.classList.remove("hidden");
    target.classList.add("active-view");
  }

  if (viewName === "play") {
    if (!storyState.activeRun) {
      storyState.selectedDistrictLevel = getNextTargetDistrictLevel();
      syncCombatFromDistrictSelection();
    }
    updateMissionBrief();
    updateRunHud();
    updateCombatUI();
  }
}

function startAdventure() {
  if (!storyState.activeRun) {
    storyState.selectedDistrictLevel = getNextTargetDistrictLevel();
    syncCombatFromDistrictSelection();
  }

  switchView("play");
}

function completedDistrictStorageKey() {
  const identity = gameState.userId || gameState.username || "runner";
  return `completedDistricts:${identity}`;
}

function loadCompletedDistricts() {
  let parsed = [];
  const raw = localStorage.getItem(completedDistrictStorageKey());
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
  }

  storyState.completedDistricts = new Set(
    parsed
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 1),
  );
}

function persistCompletedDistricts() {
  localStorage.setItem(
    completedDistrictStorageKey(),
    JSON.stringify(Array.from(storyState.completedDistricts.values())),
  );
}

function ensureSelectedDistrict() {
  const selectable = gameState.levels
    .map((level) => Number(level.level_number))
    .filter((levelNumber) => canAccessDistrict(levelNumber));

  if (selectable.length === 0) {
    storyState.selectedDistrictLevel = 1;
    return;
  }

  if (!selectable.includes(storyState.selectedDistrictLevel)) {
    storyState.selectedDistrictLevel = getNextTargetDistrictLevel();
  }
}

function getNextTargetDistrictLevel() {
  const accessibleLevels = gameState.levels
    .map((level) => Number(level.level_number))
    .filter((levelNumber) => Number.isFinite(levelNumber) && canAccessDistrict(levelNumber))
    .sort((a, b) => a - b);

  if (accessibleLevels.length === 0) {
    return 1;
  }

  const nextUnbeaten = accessibleLevels.find(
    (levelNumber) => !storyState.completedDistricts.has(levelNumber),
  );

  if (nextUnbeaten) {
    return nextUnbeaten;
  }

  return accessibleLevels[accessibleLevels.length - 1];
}

function canAccessDistrict(levelNumber) {
  if (levelNumber === 1) return true;

  // Story-mode progression: beating the previous district unlocks the next route.
  return storyState.completedDistricts.has(levelNumber - 1);
}

function getDistrictDefinition(levelNumber) {
  const predefined = DISTRICT_STORY.find((district) => district.level === levelNumber);
  if (predefined) return predefined;

  return {
    level: levelNumber,
    title: `Sector ${levelNumber}`,
    intro: "Hostile crews are contesting this block.",
    objective: "Break through all waves and defeat the district boss in time.",
    rewardText: "Clear this district to secure route access and earn credits.",
    enemyPool: ["Sector Guard", "Neon Bruiser", "Grid Hunter"],
    bossName: `Sector Overlord ${levelNumber}`,
    timeLimit: DISTRICT_TIME_LIMIT,
    waves: 4,
  };
}

function selectDistrict(levelNumber) {
  storyState.selectedDistrictLevel = levelNumber;
  syncCombatFromDistrictSelection();
  updateMissionBrief();
  updateLevelMap();
  switchView("play");
}

function syncCombatFromDistrictSelection() {
  const district = getDistrictDefinition(storyState.selectedDistrictLevel);
  combatState.enemyName = district.enemyPool[0];
  combatState.enemyTier = "Scout Wave";
  combatState.enemyMaxHealth = 100;
  combatState.enemyHealth = 100;
  combatState.combo = 0;
}

function startSelectedDistrictRun() {
  if (storyState.activeRun) return;

  const levelNumber = Number(storyState.selectedDistrictLevel || 1);

  if (!canAccessDistrict(levelNumber)) {
    alert(`You must beat District ${levelNumber - 1} before entering this district.`);
    switchView("districts");
    return;
  }

  const district = getDistrictDefinition(levelNumber);
  storyState.activeRun = {
    levelNumber,
    district,
    wave: 1,
    totalWaves: district.waves,
    timeLeft: district.timeLimit,
    status: "In Combat",
  };

  spawnRunWave();
  DOM.clickButton().disabled = false;
  DOM.retreatBtn().disabled = false;
  DOM.startRunBtn().disabled = true;
  setBattleLog(`Mission started: ${district.title}. Move fast, Runner.`);

  stopRunTimer();
  storyState.activeRun.intervalId = setInterval(() => {
    if (!storyState.activeRun) return;
    storyState.activeRun.timeLeft -= 1;

    if (storyState.activeRun.timeLeft <= 0) {
      failRun("Time expired. The district boss escaped.");
      return;
    }

    updateRunHud();
  }, 1000);

  updateRunHud();
}

function stopRunTimer() {
  if (storyState.activeRun?.intervalId) {
    clearInterval(storyState.activeRun.intervalId);
  }
}

function retreatFromRun() {
  if (!storyState.activeRun) return;
  failRun("You retreated from the district run.");
}

function failRun(message) {
  stopRunTimer();
  if (storyState.activeRun) {
    storyState.activeRun.status = "Failed";
  }

  setBattleLog(message);
  DOM.clickButton().disabled = true;
  DOM.retreatBtn().disabled = true;
  DOM.startRunBtn().disabled = false;

  storyState.activeRun = null;
  syncCombatFromDistrictSelection();
  updateUI();
}

function completeRun() {
  if (!storyState.activeRun) return;

  const levelNumber = storyState.activeRun.levelNumber;
  const bonus = Math.max(30, Math.round(35 + levelNumber * 35 + storyState.activeRun.timeLeft * 3));
  gameState.coins += bonus;
  storyState.completedDistricts.add(levelNumber);
  storyState.lastClearedDistrictLevel = levelNumber;
  persistCompletedDistricts();

  gameState.currentLevel = Math.max(gameState.currentLevel, levelNumber + 1);

  stopRunTimer();
  setBattleLog(`District ${levelNumber} cleared. Bonus +${bonus} credits.`);
  createFloatingNumber(`+${bonus} CLEAR BONUS`, window.innerWidth / 2, 130, "ko");

  DOM.clickButton().disabled = true;
  DOM.retreatBtn().disabled = true;
  DOM.startRunBtn().disabled = false;

  storyState.activeRun = null;
  storyState.selectedDistrictLevel = getNextTargetDistrictLevel();
  ensureSelectedDistrict();
  syncCombatFromDistrictSelection();
  updateUI();
  showDistrictClearModal(levelNumber, bonus);
  saveGame();
}

function spawnRunWave() {
  if (!storyState.activeRun) return;

  const run = storyState.activeRun;
  const district = run.district;
  const isBoss = run.wave === run.totalWaves;

  const enemyName = isBoss
    ? district.bossName
    : district.enemyPool[(run.wave - 1) % district.enemyPool.length];

  const playerPower = calculateAttackPower();
  const baseHp = 120 + run.levelNumber * 70 + run.wave * 85;
  const waveScaling = 1 + (run.wave - 1) * 0.18;
  const levelScaling = 1 + run.levelNumber * 0.12;
  const bossScaling = isBoss ? 2.4 : 1;
  const hp = Math.floor(
    baseHp * waveScaling * levelScaling * bossScaling * DISTRICT_HP_MULTIPLIER +
      playerPower * (isBoss ? 10 : 5),
  );

  combatState.enemyName = enemyName;
  combatState.enemyTier = isBoss ? "Boss Wave" : `Wave ${run.wave}`;
  combatState.enemyMaxHealth = hp;
  combatState.enemyHealth = hp;
  combatState.combo = 0;

  run.status = isBoss ? "Boss Battle" : "In Combat";
  updateRunHud();
}

async function clickCoin(event) {
  if (!storyState.activeRun) {
    setBattleLog("Start a district run first.");
    return;
  }

  const attackPower = calculateAttackPower();
  const critChance = Math.min(0.1 + gameState.currentLevel * 0.01, CRIT_CHANCE_CAP);
  const isCritical = Math.random() < critChance;
  const critMultiplier = isCritical ? 2 : 1;
  const comboBonus = 1 + Math.min(combatState.combo * 0.06, 1.2);
  const damage = Math.max(1, Math.round(attackPower * critMultiplier * comboBonus));

  combatState.enemyHealth = Math.max(0, combatState.enemyHealth - damage);
  combatState.combo += 1;

  const districtScale = 1 + storyState.activeRun.levelNumber * 0.08;
  const coinsGained = Math.max(1, Math.round((1 + damage * 0.24) * districtScale));
  gameState.coins += coinsGained;

  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;
  createFloatingNumber(`-${damage} HP`, x, y - 10, "damage");
  createFloatingNumber(`+${coinsGained} CR`, x, y + 22, "gain");

  if (isCritical) {
    createFloatingNumber("CRITICAL", x, y - 36, "crit");
  }

  if (combatState.enemyHealth <= 0) {
    handleWaveClear(x, y);
  } else {
    setBattleLog(`${isCritical ? "Critical strike" : "Hit landed"} for ${damage} damage.`);
  }

  updateUI();

  try {
    await apiCall("/game/click", { coins_per_click: coinsGained });
  } catch (error) {
    console.error("Click error:", error);
  }
}

function handleWaveClear(x, y) {
  if (!storyState.activeRun) return;

  const run = storyState.activeRun;
  const isBoss = run.wave === run.totalWaves;

  const waveBonus = Math.max(8, Math.round(combatState.enemyMaxHealth * (isBoss ? 0.2 : 0.12)));
  gameState.coins += waveBonus;
  createFloatingNumber(`+${waveBonus} WAVE`, x, y - 46, "gain");

  if (isBoss) {
    completeRun();
    return;
  }

  run.wave += 1;
  setBattleLog(`Wave cleared. Enemy reinforcements incoming.`);
  spawnRunWave();
  updateUI();
}

function updatePassiveIncome() {
  if (!gameState.token) return;

  const now = Date.now();
  const secondsPassed = (now - gameState.lastUpdateTime) / 1000;
  gameState.lastUpdateTime = now;

  const coinsGained = gameState.coinsPerSecond * secondsPassed;
  gameState.coins += coinsGained;

  if (coinsGained > 0.1) {
    createFloatingNumber(`+${coinsGained.toFixed(1)} AUTO`, window.innerWidth / 2, 90, "auto");
  }

  if (Math.floor(secondsPassed) > 0) {
    apiCall("/game/update-coins", {
      seconds_passed: Math.floor(secondsPassed),
    }).catch((error) => console.error("Update coins error:", error));
  }

  updateUI();
}

async function buyUpgrade(upgradeId) {
  try {
    const data = await apiCall("/game/buy-upgrade", { upgrade_id: upgradeId });
    gameState.coins = Number(data.coins ?? gameState.coins);
    gameState.coinsPerSecond = Number(data.coins_per_second ?? gameState.coinsPerSecond);
    await loadGameState();
  } catch (error) {
    alert(error.message || "Cannot buy upgrade");
  }
}

async function unlockLevelWithCoins(levelNumber, options = {}) {
  const { silent = false } = options;

  try {
    await apiCall("/game/unlock-level", { level_number: levelNumber });
    await loadGameState();
  } catch (error) {
    if (!silent) {
      alert(error.message || "Cannot unlock district");
    }
  }
}

function checkLevelUnlocks() {
  if (autoUnlockInFlight) return;

  const nextLockedLevel = [...gameState.levels]
    .filter((level) => !level.unlocked)
    .sort((a, b) => Number(a.level_number) - Number(b.level_number))[0];

  if (!nextLockedLevel || Number(nextLockedLevel.coin_threshold) <= 0) return;
  if (gameState.coins < Number(nextLockedLevel.coin_threshold)) return;

  autoUnlockInFlight = true;
  unlockLevelWithCoins(Number(nextLockedLevel.level_number), { silent: true }).finally(() => {
    autoUnlockInFlight = false;
  });
}

function updateUI() {
  const progression = getProgressionState();

  DOM.coinCount().textContent = formatNumber(gameState.coins);
  DOM.cpsCount().textContent = Number(gameState.coinsPerSecond || 0).toFixed(1);
  DOM.attackPower().textContent = formatNumber(calculateAttackPower());
  DOM.playerRank().textContent = `Street Rank ${Math.max(1, gameState.currentLevel)}`;

  updateProgressionUI(progression);
  updateRunHud();
  updateMissionBrief();
  updateCombatUI();
  updateHomePanel();
  updateUpgradeStore();
  updateLevelMap();
  checkLevelUnlocks();
}

function updateHomePanel() {
  const targetLevel = getNextTargetDistrictLevel();
  const selected = getDistrictDefinition(targetLevel);
  const isTargetCompleted = storyState.completedDistricts.has(targetLevel);

  DOM.homeStoryText().textContent = `Welcome back, ${gameState.username || "Runner"}. ${selected.intro}`;
  DOM.homeCurrentMission().textContent = isTargetCompleted
    ? `All currently accessible districts cleared. Replay ${selected.title} or unlock the next route.`
    : `Next target - ${selected.title}: ${selected.objective}`;
  DOM.homeProgress().textContent = `${storyState.completedDistricts.size} districts cleared`;

  const roadmapRoot = DOM.homeDistrictRoadmap();
  if (!roadmapRoot) return;

  roadmapRoot.innerHTML = "";

  const availableLevels = gameState.levels
    .map((level) => Number(level.level_number))
    .filter((levelNumber) => Number.isFinite(levelNumber))
    .sort((a, b) => a - b)
    .slice(0, 8);

  let nextRequiredMarked = false;

  availableLevels.forEach((levelNumber) => {
    const district = getDistrictDefinition(levelNumber);
    const isCompleted = storyState.completedDistricts.has(levelNumber);
    const canEnter = canAccessDistrict(levelNumber);
    const levelData = gameState.levels.find(
      (level) => Number(level.level_number) === levelNumber,
    );
    const isUnlocked = Boolean(levelData?.unlocked) || levelNumber === 1;

    let status = "Locked";
    let statusClass = "locked";

    if (isCompleted) {
      status = "Completed";
      statusClass = "completed";
    } else if (!nextRequiredMarked && canEnter) {
      status = "Next to Beat";
      statusClass = "next";
      nextRequiredMarked = true;
    } else if (canEnter) {
      status = "Available";
      statusClass = "available";
    } else if (isUnlocked) {
      status = `Beat District ${Math.max(1, levelNumber - 1)} first`;
      statusClass = "gated";
    }

    const row = document.createElement("div");
    row.className = `roadmap-item ${statusClass}`;
    row.innerHTML = `
      <div class="roadmap-main">
        <span class="roadmap-level">District ${levelNumber}</span>
        <span class="roadmap-name">${escapeHtml(district.title)}</span>
      </div>
      <div class="roadmap-status">${escapeHtml(status)}</div>
    `;
    roadmapRoot.appendChild(row);
  });
}

function updateRunHud() {
  const run = storyState.activeRun;
  if (!run) {
    DOM.missionTimer().textContent = "--";
    DOM.waveLabel().textContent = "0/0";
    DOM.runStatusLabel().textContent = "Idle";
    DOM.startRunBtn().disabled = false;
    DOM.clickButton().disabled = true;
    DOM.retreatBtn().disabled = true;
    return;
  }

  DOM.missionTimer().textContent = `${run.timeLeft}s`;
  DOM.waveLabel().textContent = `${run.wave}/${run.totalWaves}`;
  DOM.runStatusLabel().textContent = run.status;
}

function updateMissionBrief() {
  const district = getDistrictDefinition(storyState.selectedDistrictLevel);
  DOM.districtTitle().textContent = `District ${district.level}: ${district.title}`;
  DOM.playerRoleText().textContent = `Route ${district.level} Operative`;
  DOM.districtStoryText().textContent = district.intro;
  DOM.districtObjectiveText().textContent = `Objective: ${district.objective}`;
  DOM.districtRewardText().textContent = district.rewardText;
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
    const ownedCount = Number(upgrade.owned_count || 0);
    const maxOwnedCount = Number(upgrade.max_owned_count || 1);
    const isMaxed = ownedCount >= maxOwnedCount;
    const cost = Math.ceil(Number(upgrade.base_cost || 0) * Math.pow(1.15, ownedCount));
    const canAfford = gameState.coins >= cost;
    const canBuy = canAfford && !isMaxed;

    const currentAutoDamage = getUpgradeTotalAutoDamage(upgrade.coins_per_second_gain, ownedCount);
    const nextAutoDamage = getUpgradeTotalAutoDamage(upgrade.coins_per_second_gain, ownedCount + 1);
    const nextGain = Math.max(0, nextAutoDamage - currentAutoDamage);

    const card = document.createElement("div");
    card.className = "upgrade-card";

    const safeName = escapeHtml(getWeaponName(index));
    const safeDescription = escapeHtml(String(upgrade.description || "Combat enhancement"));

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
      <button class="btn btn-upgrade" ${!canBuy ? "disabled" : ""} data-upgrade-id="${upgrade.id}">
        ${isMaxed ? "MAXED" : "Upgrade"}
      </button>
    `;

    card.querySelector(".btn-upgrade").addEventListener("click", () => buyUpgrade(Number(upgrade.id)));
    store.appendChild(card);
  });
}

function updateLevelMap() {
  const map = DOM.levelMap();
  map.innerHTML = "";

  gameState.levels.forEach((level) => {
    const levelNumber = Number(level.level_number);
    const district = getDistrictDefinition(levelNumber);
    const isUnlocked = Boolean(level.unlocked) || levelNumber === 1;
    const isCompleted = storyState.completedDistricts.has(levelNumber);
    const canEnter = canAccessDistrict(levelNumber);
    const isSelected = storyState.selectedDistrictLevel === levelNumber;

    const card = document.createElement("div");
    card.className = `level-card ${isUnlocked ? "unlocked" : ""} ${isSelected ? "selected" : ""}`;

    let status = "Locked";
    if (isCompleted) {
      status = "Completed";
    } else if (canEnter) {
      status = "Ready";
    } else {
      status = `Beat District ${Math.max(1, levelNumber - 1)} first`;
    }

    card.innerHTML = `
      <div class="level-header">
        <div class="level-title">District ${levelNumber}: ${escapeHtml(district.title)}</div>
        <div class="level-status ${isUnlocked ? "" : "locked"}">${status}</div>
      </div>
      <div class="level-threshold">${escapeHtml(district.intro)}</div>
      <div class="level-threshold">Time Limit: ${district.timeLimit}s · Waves: ${district.waves}</div>
    `;

    const actions = document.createElement("div");

    if (!canEnter && !isCompleted && !isUnlocked && Number(level.coin_threshold) > 0) {
      const unlockBtn = document.createElement("button");
      unlockBtn.className = "btn btn-level";
      unlockBtn.textContent = `Unlock (${formatNumber(Number(level.coin_threshold))} coins)`;
      unlockBtn.disabled = gameState.coins < Number(level.coin_threshold);
      unlockBtn.addEventListener("click", () => unlockLevelWithCoins(levelNumber));
      actions.appendChild(unlockBtn);

      const payBtn = document.createElement("button");
      payBtn.className = "btn btn-level";
      payBtn.textContent = `Pay to Unlock ($${(LEVEL_PRICES[levelNumber] || 299) / 100})`;
      payBtn.addEventListener("click", () => openPaymentModal(levelNumber));
      actions.appendChild(payBtn);
    } else {
      const selectBtn = document.createElement("button");
      selectBtn.className = "btn btn-level";
      selectBtn.textContent = isSelected ? "Selected" : isCompleted ? "Replay" : "Select District";
      selectBtn.disabled = !canEnter;
      selectBtn.addEventListener("click", () => selectDistrict(levelNumber));
      actions.appendChild(selectBtn);
    }

    card.appendChild(actions);
    map.appendChild(card);
  });
}

function getUpgradeTotalAutoDamage(baseGain, ownedCount) {
  if (!ownedCount || ownedCount <= 0) return 0;
  const growthMultiplier = 1 + 0.5 * (ownedCount - 1);
  return Number(baseGain || 0) * growthMultiplier;
}

function getWeaponName(index) {
  return WEAPON_LABELS[index % WEAPON_LABELS.length] || "Combat Mod";
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

  const milestoneCount = MILESTONE_LEVELS.filter((level) => gameState.currentLevel >= level).length;
  const milestoneDamageBonus = milestoneCount * 2;
  const tierSpikeBonus = (tier - 1) * 3;

  return {
    tier,
    tierName: WEAPON_TIER_NAMES[tier - 1] || "Brawler I",
    modsToNextTier,
    milestoneDamageBonus,
    tierSpikeBonus,
  };
}

function updateProgressionUI(progression) {
  DOM.weaponTierLabel().textContent = progression.tierName;
  DOM.nextTierLabel().textContent = progression.modsToNextTier > 0 ? `${progression.modsToNextTier} mods` : "Tier maxed";
  DOM.milestoneLabel().textContent = `+${progression.milestoneDamageBonus} dmg`;

  const curveText =
    progression.modsToNextTier <= 1
      ? "Power spike incoming"
      : progression.milestoneDamageBonus > 0
        ? "Milestone pacing active"
        : "Build your first spike";

  DOM.powerCurveLabel().textContent = curveText;
}

function updateCombatUI() {
  const healthPercent =
    combatState.enemyMaxHealth > 0
      ? (combatState.enemyHealth / combatState.enemyMaxHealth) * 100
      : 0;

  DOM.enemyName().textContent = combatState.enemyName;
  DOM.enemyTier().textContent = combatState.enemyTier;
  DOM.enemyHealthFill().style.width = `${Math.max(0, healthPercent)}%`;
  DOM.enemyHealthText().textContent = `${formatNumber(combatState.enemyHealth)} / ${formatNumber(combatState.enemyMaxHealth)}`;
  DOM.comboCount().textContent = `x${combatState.combo}`;
}

function setBattleLog(text) {
  DOM.battleLog().textContent = text;
}

function createFloatingNumber(text, x, y, variant = "") {
  const container = DOM.floatingNumbersContainer();
  const number = document.createElement("div");
  number.className = `floating-number ${variant}`.trim();
  number.textContent = text;
  number.style.left = `${x}px`;
  number.style.top = `${y}px`;

  container.appendChild(number);

  setTimeout(() => {
    number.remove();
  }, FLOATING_NUMBER_DURATION);
}

function openPaymentModal(levelNumber) {
  DOM.paymentModal().classList.add("active");
  DOM.paymentLevelNumber().textContent = String(levelNumber);
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

function showDistrictClearModal(levelNumber, bonus) {
  const modal = DOM.districtClearModal();
  const nextLevel = levelNumber + 1;
  const hasNextLevel = gameState.levels.some(
    (level) => Number(level.level_number) === nextLevel,
  );
  const canFightNext = hasNextLevel && canAccessDistrict(nextLevel);

  DOM.clearDistrictLabel().textContent = `District ${levelNumber}`;
  DOM.clearBonusLabel().textContent = `+${formatNumber(bonus)} CR`;
  DOM.clearNextBtn().disabled = !canFightNext;
  DOM.clearNextBtn().textContent = canFightNext
    ? `Fight District ${nextLevel}`
    : "Next District Locked";
  DOM.clearNextBtn().dataset.nextLevel = String(nextLevel);

  modal.classList.add("active");
}

function hideDistrictClearModal() {
  DOM.districtClearModal().classList.remove("active");
}

function continueToNextDistrict() {
  const nextLevel = Number(DOM.clearNextBtn().dataset.nextLevel || 0);

  if (!nextLevel || !canAccessDistrict(nextLevel)) {
    return;
  }

  hideDistrictClearModal();
  selectDistrict(nextLevel);
  startSelectedDistrictRun();
}

async function initializeXsollaPayment(levelNumber) {
  try {
    const tokenData = await apiCall("/xsolla/token", { level_number: levelNumber });
    const accessToken = tokenData.token;
    const isSandbox = tokenData.sandbox === true;

    DOM.paymentLoading().classList.add("hidden");

    if (!window.XPayStationWidget) {
      const script = document.createElement("script");
      script.src = "https://cdn.xsolla.net/payments-bucket-prod/embed/1.5.4/widget.min.js";
      script.async = true;
      script.addEventListener("load", () => openXsollaPayStation(accessToken, levelNumber, isSandbox));
      script.addEventListener("error", () => {
        throw new Error("Failed to load payment widget script");
      });
      document.head.appendChild(script);
    } else {
      openXsollaPayStation(accessToken, levelNumber, isSandbox);
    }
  } catch (error) {
    DOM.paymentLoading().classList.add("hidden");
    alert(`Failed to open payment system: ${error.message}`);
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

  window.XPayStationWidget.on(window.XPayStationWidget.eventTypes.STATUS, (event, data) => {
    if (data.status === "done") {
      handlePaymentSuccess(data, levelNumber);
    }
  });

  window.XPayStationWidget.on(window.XPayStationWidget.eventTypes.CLOSE, () => {
    closePaymentModal();
  });

  window.XPayStationWidget.on(window.XPayStationWidget.eventTypes.ERROR, (event, data) => {
    handlePaymentError(data);
  });

  window.XPayStationWidget.init(options);
  window.XPayStationWidget.open();
}

async function handlePaymentSuccess(transaction, levelNumber) {
  try {
    const transactionId = transaction.transaction_id || transaction.invoice || `local_${Date.now()}`;
    const amountCents = LEVEL_PRICES[levelNumber] || 299;

    await apiCall("/game/unlock-level-payment", {
      level_number: levelNumber,
      xsolla_payment_id: transactionId,
      amount_cents: amountCents,
    });

    alert(`District ${levelNumber} unlocked.`);
    closePaymentModal();
    await loadGameState();
    switchView("districts");
  } catch (error) {
    console.error("Payment success handling error:", error);
    alert("District unlocked, but local sync failed. Refresh if needed.");
    closePaymentModal();
  }
}

function handlePaymentError(error) {
  alert(`Payment failed. Please try again. Error: ${error.message || error}`);
  closePaymentModal();
}

function applySoftCap(value, cap, rate) {
  if (value <= 0) return 0;
  return Math.round(cap * (1 - Math.exp(-value / rate)));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(num) {
  if (num >= 1000000000000) return `${(num / 1000000000000).toFixed(2)}T`;
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return Math.floor(num).toString();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

window.closePaymentModal = closePaymentModal;
