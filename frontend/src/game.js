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
const TIME_WARNING_THRESHOLD = 10; // Warning when less than 10 seconds remaining

// Sound System
const SOUND_ENABLED_KEY = 'soundEnabled';
let soundEnabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
let audioContext = null;
let audioContextInitialized = false;

function initAudioContext() {
  if (audioContextInitialized) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported');
      return;
    }

    audioContext = new AudioContextClass();

    // Handle audio context state changes
    audioContext.addEventListener('statechange', () => {
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
          console.warn('Failed to resume audio context:', err);
        });
      }
    });

    // Handle audio context errors
    audioContext.addEventListener('error', (event) => {
      console.error('Audio context error:', event);
      audioContextInitialized = false;
      audioContext = null;
    });

    audioContextInitialized = true;
  } catch (error) {
    console.error('Failed to initialize audio context:', error);
    audioContextInitialized = false;
  }
}

function playSound(type) {
  if (!soundEnabled) return;

  // Initialize audio context on first user interaction if needed
  if (!audioContextInitialized) {
    initAudioContext();
  }

  if (!audioContext) {
    console.warn('Audio context not available');
    return;
  }

  // Resume audio context if suspended (required by some browsers)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(err => {
      console.warn('Failed to resume audio context:', err);
      return;
    });
  }

  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'hit':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case 'critical':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'wave_clear':
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        break;
      case 'boss_defeat':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'achievement':
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'upgrade':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
    }
  } catch (error) {
    console.error('Error playing sound:', error);
    // Reset audio context on error
    audioContextInitialized = false;
    audioContext = null;
  }
}

// Achievement System
const ACHIEVEMENTS_KEY = 'achievements';
const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_boss', name: 'Boss Hunter', description: 'Defeat your first district boss' },
  { id: 'combo_master', name: 'Combo Master', description: 'Reach a 10x combo' },
  { id: 'district_3', name: 'District Conqueror', description: 'Clear District 3' },
  { id: 'max_upgrade', name: 'Fully Loaded', description: 'Max out any weapon upgrade' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Clear a district with 15+ seconds remaining' },
  { id: 'district_5', name: 'Veteran Runner', description: 'Clear District 5' },
  { id: 'combo_20', name: 'Unstoppable', description: 'Reach a 20x combo' },
  { id: 'wealthy', name: 'Credit King', description: 'Earn 10,000 total credits' },
];

let achievements = new Set();
let totalCreditsEarned = 0;
let timeWarningTriggered = false; // Track if we've warned about low time

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(SOUND_ENABLED_KEY, soundEnabled);
  updateSoundButton();
}

function updateSoundButton() {
  const soundBtn = document.getElementById('soundToggle');
  if (soundBtn) {
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
    soundBtn.title = soundEnabled ? 'Sound On' : 'Sound Off';
  }
}

// Achievement System
function loadAchievements() {
  try {
    const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      achievements = new Set(parsed);
    }
  } catch (error) {
    console.error('Error loading achievements:', error);
    achievements = new Set();
  }
}

function saveAchievements() {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(Array.from(achievements)));
}

function unlockAchievement(achievementId) {
  if (achievements.has(achievementId)) return;

  achievements.add(achievementId);
  saveAchievements();
  playSound('achievement');

  const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
  if (achievement) {
    showAchievementNotification(achievement);
  }
}

function showAchievementNotification(achievement) {
  const container = document.getElementById('achievementContainer');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = 'achievement-notification';
  notification.innerHTML = `
    <div class="achievement-icon">🏆</div>
    <div class="achievement-info">
      <div class="achievement-title">Achievement Unlocked!</div>
      <div class="achievement-name">${escapeHtml(achievement.name)}</div>
      <div class="achievement-desc">${escapeHtml(achievement.description)}</div>
    </div>
  `;

  container.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('show');
  }, 100);

  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function checkAchievements() {
  // Check combo achievements
  if (combatState.combo >= 10) unlockAchievement('combo_master');
  if (combatState.combo >= 20) unlockAchievement('combo_20');

  // Check district achievements
  if (storyState.completedDistricts.has(3)) unlockAchievement('district_3');
  if (storyState.completedDistricts.has(5)) unlockAchievement('district_5');

  // Check wealth achievement
  if (totalCreditsEarned >= 10000) unlockAchievement('wealthy');

  // Check upgrade achievements
  gameState.upgrades.forEach(upgrade => {
    const ownedCount = Number(upgrade.owned_count || 0);
    const maxOwnedCount = Number(upgrade.max_owned_count || 1);
    if (ownedCount >= maxOwnedCount && maxOwnedCount > 0) {
      unlockAchievement('max_upgrade');
    }
  });
}

function updateAchievementsDisplay() {
  const container = document.getElementById('achievementsList');
  if (!container) return;

  container.innerHTML = '';

  ACHIEVEMENT_DEFINITIONS.forEach(achievement => {
    const isUnlocked = achievements.has(achievement.id);
    const item = document.createElement('div');
    item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
    item.innerHTML = `
      <div class="achievement-status">${isUnlocked ? '✓' : '🔒'}</div>
      <div class="achievement-details">
        <div class="achievement-name">${escapeHtml(achievement.name)}</div>
        <div class="achievement-desc">${escapeHtml(achievement.description)}</div>
      </div>
    `;
    container.appendChild(item);
  });
}

// Visual Feedback System
function triggerScreenShake(intensity = 1) {
  const gameContainer = DOM.gameContainer();
  if (!gameContainer) return;

  gameContainer.style.animation = 'none';
  gameContainer.offsetHeight; // Trigger reflow
  gameContainer.style.animation = `shake ${0.3 * intensity}s ease-in-out`;
}

function triggerDamageFlash() {
  const fightArena = document.querySelector('.fight-arena');
  if (!fightArena) return;

  fightArena.classList.add('damage-flash');
  setTimeout(() => {
    fightArena.classList.remove('damage-flash');
  }, 150);
}

function createParticleEffect(x, y, type = 'hit') {
  const container = DOM.floatingNumbersContainer();
  if (!container) return;

  const particleCount = type === 'critical' ? 12 : type === 'wave_clear' ? 20 : 8;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = `particle particle-${type}`;

    const angle = (Math.PI * 2 * i) / particleCount;
    const velocity = 2 + Math.random() * 3;
    const size = 4 + Math.random() * 6;

    particle.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${type === 'critical' ? '#ff6a86' : type === 'wave_clear' ? '#8edc87' : '#50cfe0'};
      pointer-events: none;
      z-index: 201;
    `;

    container.appendChild(particle);

    const animation = particle.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      {
        transform: `translate(${Math.cos(angle) * 100 * velocity}px, ${Math.sin(angle) * 100 * velocity}px) scale(0)`,
        opacity: 0
      }
    ], {
      duration: 600 + Math.random() * 200,
      easing: 'cubic-bezier(0, 0.5, 0.5, 1)'
    });

    animation.onfinish = () => particle.remove();
  }
}

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

const WEAPON_LOADOUT = [
  {
    name: "Street Gloves",
    artPath: "/src/assets/weapons/street-gloves.svg",
    tier: "Starter",
    description: "Balanced gloves with fast recovery. Great for building early combos.",
    flavor: "Combo speed + control",
  },
  {
    name: "Chain Whip",
    artPath: "/src/assets/weapons/chain-whip.svg",
    tier: "Control",
    description: "Linked strike coil that punishes evasive enemies with wide swings.",
    flavor: "Area pressure",
  },
  {
    name: "Neon Bat",
    artPath: "/src/assets/weapons/neon-bat.svg",
    tier: "Impact",
    description: "Charged bat that delivers heavy hits and staggers frontliners.",
    flavor: "Burst damage",
  },
  {
    name: "Pulse Knife",
    artPath: "/src/assets/weapons/pulse-knife.svg",
    tier: "Assassin",
    description: "Pulse-edged blade tuned for precision cuts and critical finishers.",
    flavor: "Crit-focused",
  },
  {
    name: "Shock Gauntlet",
    artPath: "/src/assets/weapons/shock-gauntlet.svg",
    tier: "Arc",
    description: "Voltage gauntlet that amplifies every close-range strike.",
    flavor: "Sustained power",
  },
  {
    name: "Riot Hammer",
    artPath: "/src/assets/weapons/riot-hammer.svg",
    tier: "Breaker",
    description: "Crowd-control hammer built to crack armor and boss defenses.",
    flavor: "Armor breaker",
  },
  {
    name: "Phantom Blade",
    artPath: "/src/assets/weapons/phantom-blade.svg",
    tier: "Stealth",
    description: "Phase-shift blade that strikes before enemies can react.",
    flavor: "High tempo",
  },
  {
    name: "Turbo Knuckles",
    artPath: "/src/assets/weapons/turbo-knuckles.svg",
    tier: "Rush",
    description: "Boosted knuckles designed for relentless close-range barrages.",
    flavor: "Rapid chaining",
  },
  {
    name: "Rail Lance",
    artPath: "/src/assets/weapons/rail-lance.svg",
    tier: "Pierce",
    description: "Rail-accelerated lance that pierces elite targets with force.",
    flavor: "Boss hunter",
  },
  {
    name: "Night Fang",
    artPath: "/src/assets/weapons/night-fang.svg",
    tier: "Mythic",
    description: "Legendary fang weapon that scales aggressively in late districts.",
    flavor: "Endgame scaling",
  },
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
  timeProgressBar: () => document.getElementById("timeProgressBar"),
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

  // Load achievements
  loadAchievements();

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

  // Initialize sound button
  updateSoundButton();
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
  document.getElementById("navAchievementsBtn").addEventListener("click", () => switchView("achievements"));
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

  // Sound toggle
  const soundToggle = document.getElementById('soundToggle');
  if (soundToggle) {
    soundToggle.addEventListener('click', () => {
      toggleSound();
      // Initialize audio context on first interaction
      if (!audioContextInitialized) {
        initAudioContext();
      }
    });
  }

  // Initialize audio context on first user interaction (required by browsers)
  const initAudioOnInteraction = () => {
    if (!audioContextInitialized) {
      initAudioContext();
    }
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('keydown', initAudioOnInteraction);
  };

  document.addEventListener('click', initAudioOnInteraction);
  document.addEventListener('keydown', initAudioOnInteraction);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        if (storyState.activeRun && !DOM.clickButton().disabled) {
          clickCoin({ clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 });
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (DOM.paymentModal().classList.contains('active')) {
          closePaymentModal();
        } else if (DOM.districtClearModal().classList.contains('active')) {
          hideDistrictClearModal();
        } else {
          switchView('home');
        }
        break;
      case '1':
        switchView('home');
        break;
      case '2':
        switchView('play');
        break;
      case '3':
        switchView('store');
        break;
      case '4':
        switchView('districts');
        break;
      case '5':
        switchView('achievements');
        break;
      case 's':
      case 'S':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          saveGame();
        }
        break;
    }
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
    achievements: "achievementsView",
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
  } else if (viewName === "achievements") {
    updateAchievementsDisplay();
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

function getRecommendedPowerForDistrict(levelNumber, district) {
  const safeLevel = Math.max(1, Number(levelNumber || 1));
  const waveCount = Math.max(1, Number(district?.waves || 1));
  return Math.round(26 + safeLevel * 18 + waveCount * 12);
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

  // Reset time warning trigger
  timeWarningTriggered = false;

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

    // Check for low time warning
    if (storyState.activeRun.timeLeft === TIME_WARNING_THRESHOLD && !timeWarningTriggered) {
      timeWarningTriggered = true;
      playSound('critical');
      triggerScreenShake(1);
      setBattleLog(`⚠️ WARNING: Only ${TIME_WARNING_THRESHOLD} seconds remaining!`);
      createFloatingNumber(`⚠️ ${TIME_WARNING_THRESHOLD}s LEFT!`, window.innerWidth / 2, 200, "crit");
    }

    // Additional warnings at critical time points
    if (storyState.activeRun.timeLeft === 5 && timeWarningTriggered) {
      playSound('critical');
      triggerScreenShake(1.5);
      setBattleLog(`🚨 CRITICAL: 5 seconds remaining!`);
      createFloatingNumber(`🚨 5s LEFT!`, window.innerWidth / 2, 200, "crit");
    }

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
  totalCreditsEarned += bonus;
  storyState.completedDistricts.add(levelNumber);
  storyState.lastClearedDistrictLevel = levelNumber;
  persistCompletedDistricts();

  // Check achievements
  unlockAchievement('first_boss');
  if (storyState.activeRun.timeLeft >= 15) {
    unlockAchievement('speed_demon');
  }
  checkAchievements();

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
  totalCreditsEarned += coinsGained;

  const x = event?.clientX ?? window.innerWidth / 2;
  const y = event?.clientY ?? window.innerHeight / 2;

  // Sound and visual feedback
  if (isCritical) {
    playSound('critical');
    triggerScreenShake(1.5);
    triggerDamageFlash();
    createParticleEffect(x, y, 'critical');
    createFloatingNumber("CRITICAL", x, y - 36, "crit");
  } else {
    playSound('hit');
    triggerScreenShake(0.5);
    createParticleEffect(x, y, 'hit');
  }

  createFloatingNumber(`-${damage} HP`, x, y - 10, "damage");
  createFloatingNumber(`+${coinsGained} CR`, x, y + 22, "gain");

  if (combatState.enemyHealth <= 0) {
    handleWaveClear(x, y);
  } else {
    setBattleLog(`${isCritical ? "Critical strike" : "Hit landed"} for ${damage} damage.`);
  }

  // Check achievements
  checkAchievements();

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
  totalCreditsEarned += waveBonus;

  // Sound and visual feedback
  if (isBoss) {
    playSound('boss_defeat');
    triggerScreenShake(2);
    createParticleEffect(x, y, 'wave_clear');
  } else {
    playSound('wave_clear');
    triggerScreenShake(1);
    createParticleEffect(x, y, 'wave_clear');
  }

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

    // Load updated game state without switching views
    const stateData = await apiCall("/game/state", null, "GET");
    gameState.upgrades = Array.isArray(stateData.upgrades) ? stateData.upgrades : [];
    gameState.levels = Array.isArray(stateData.levels) ? stateData.levels : [];

    playSound('upgrade');
    checkAchievements();
    updateUI(); // Update UI while staying in current view
  } catch (error) {
    alert(error.message || "Cannot buy upgrade");
  }
}

async function unlockLevelWithCoins(levelNumber, options = {}) {
  const { silent = false } = options;

  try {
    await apiCall("/game/unlock-level", { level_number: levelNumber });

    // Load updated game state without switching views
    const stateData = await apiCall("/game/state", null, "GET");
    gameState.upgrades = Array.isArray(stateData.upgrades) ? stateData.upgrades : [];
    gameState.levels = Array.isArray(stateData.levels) ? stateData.levels : [];
    gameState.coins = Number(stateData.coins ?? gameState.coins);
    gameState.coinsPerSecond = Number(stateData.coins_per_second ?? gameState.coinsPerSecond);

    updateUI(); // Update UI while staying in current view
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
  const recommendedPower = getRecommendedPowerForDistrict(targetLevel, selected);
  const totalDistricts = Math.max(1, gameState.levels.length || DISTRICT_STORY.length);
  const completedCount = storyState.completedDistricts.size;
  const progressPercent = Math.min(100, Math.round((completedCount / totalDistricts) * 100));
  const completedSorted = Array.from(storyState.completedDistricts.values()).sort((a, b) => b - a);
  const lastClearedLevel = completedSorted[0] || null;

  DOM.homeStoryText().textContent = `Welcome back, ${gameState.username || "Runner"}. ${selected.intro}`;
  DOM.homeCurrentMission().textContent = isTargetCompleted
    ? `All currently accessible districts cleared. Unlock the next route to continue.`
    : `${selected.objective}`;
  DOM.homeProgress().textContent = `${completedCount} / ${totalDistricts} districts cleared`;

  const targetDistrictText = document.getElementById("homeTargetDistrict");
  if (targetDistrictText) {
    targetDistrictText.textContent = `District ${targetLevel}: ${selected.title}`;
  }

  const targetTimeText = document.getElementById("homeTargetTime");
  if (targetTimeText) {
    targetTimeText.textContent = `${selected.timeLimit || DISTRICT_TIME_LIMIT}s`;
  }

  const recommendedPowerText = document.getElementById("homeRecommendedPower");
  if (recommendedPowerText) {
    recommendedPowerText.textContent = `${formatNumber(recommendedPower)} ATK`;
  }

  const progressFill = document.getElementById("homeProgressFill");
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }

  const lastClearedText = document.getElementById("homeLastCleared");
  if (lastClearedText) {
    lastClearedText.textContent = lastClearedLevel
      ? `Last cleared: District ${lastClearedLevel}`
      : "Last cleared: none";
  }

  const homeOpsTip = document.getElementById("homeOpsTip");
  if (homeOpsTip) {
    homeOpsTip.textContent = isTargetCompleted
      ? "Route update: all open districts completed. Unlock the next district gate to continue."
      : `Route update: prep for District ${targetLevel} - ${selected.title}.`;
  }

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
    DOM.missionTimer().className = "timer-display";
    DOM.timeProgressBar().style.width = "100%";
    DOM.timeProgressBar().className = "time-progress-bar";
    DOM.waveLabel().textContent = "0/0";
    DOM.runStatusLabel().textContent = "Idle";
    DOM.startRunBtn().disabled = false;
    DOM.clickButton().disabled = true;
    DOM.retreatBtn().disabled = true;
    return;
  }

  DOM.missionTimer().textContent = `${run.timeLeft}s`;

  // Calculate time progress percentage
  const totalTime = run.district?.timeLimit || DISTRICT_TIME_LIMIT;
  const timePercent = Math.max(0, (run.timeLeft / totalTime) * 100);
  DOM.timeProgressBar().style.width = `${timePercent}%`;

  // Apply warning styling based on remaining time
  DOM.missionTimer().className = "timer-display";
  DOM.timeProgressBar().className = "time-progress-bar";

  if (run.timeLeft <= 5) {
    DOM.missionTimer().classList.add("critical");
    DOM.timeProgressBar().classList.add("critical");
  } else if (run.timeLeft <= TIME_WARNING_THRESHOLD) {
    DOM.missionTimer().classList.add("warning");
    DOM.timeProgressBar().classList.add("warning");
  }

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

    const profile = getWeaponProfile(index);

    const card = document.createElement("div");
    card.className = `upgrade-card weapon-theme-${index % 6}`;

    const safeName = escapeHtml(profile.name);
    const safeDescription = escapeHtml(profile.description);
    const safeFlavor = escapeHtml(profile.flavor);
    const safeTier = escapeHtml(profile.tier);

    card.innerHTML = `
      <div class="upgrade-layout">
        <div class="upgrade-art" aria-hidden="true">
          <img class="weapon-image" src="${profile.artPath}" alt="${safeName}" loading="lazy" />
          <span class="weapon-tag">${safeTier}</span>
        </div>
        <div>
          <div class="upgrade-header">
            <div>
              <div class="upgrade-title">${upgrade.icon || "MOD"} ${safeName}</div>
              <div class="upgrade-description">${safeDescription}</div>
            </div>
            <div class="upgrade-owned">x${ownedCount}/${maxOwnedCount}</div>
          </div>
          <div class="upgrade-flavor">${safeFlavor}</div>
          <div class="upgrade-metrics">
            <div class="upgrade-cost">Cost: ${formatNumber(cost)} CR</div>
            <div class="upgrade-cps">Auto-damage: ${currentAutoDamage.toFixed(2)}/sec</div>
            <div class="upgrade-cps">Next gain: +${nextGain.toFixed(2)}/sec</div>
          </div>
        </div>
      </div>
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
  return getWeaponProfile(index).name;
}

function getWeaponProfile(index) {
  return WEAPON_LOADOUT[index % WEAPON_LOADOUT.length] || {
    name: "Combat Mod",
    artPath: "/src/assets/weapons/street-gloves.svg",
    tier: "Core",
    description: "Standard combat enhancement module.",
    flavor: "Reliable upgrade",
  };
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
  const battleLog = DOM.battleLog();
  battleLog.textContent = text;

  // Apply warning styling based on content
  battleLog.className = "battle-log";
  if (text.includes("CRITICAL") || text.includes("🚨")) {
    battleLog.classList.add("critical");
  } else if (text.includes("WARNING") || text.includes("⚠️")) {
    battleLog.classList.add("warning");
  }
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

let paymentCheckInterval = null;
let currentPaymentLevel = null;

function openXsollaPayStation(accessToken, levelNumber, isSandbox) {
  currentPaymentLevel = levelNumber; // Store for manual check

  console.log('Opening Xsolla PayStation:', {
    levelNumber,
    isSandbox,
    hasAccessToken: !!accessToken
  });

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

  console.log('Setting up Xsolla event listeners...');

  // Clear any existing event listeners and intervals
  if (window.XPayStationWidget) {
    console.log('Clearing existing Xsolla event listeners...');
    window.XPayStationWidget.off(window.XPayStationWidget.eventTypes.STATUS);
    window.XPayStationWidget.off(window.XPayStationWidget.eventTypes.CLOSE);
    window.XPayStationWidget.off(window.XPayStationWidget.eventTypes.ERROR);
    window.XPayStationWidget.off(window.XPayStationWidget.eventTypes.SUCCESS);
  }

  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
    paymentCheckInterval = null;
  }

  // Store the initial unlocked state to detect changes
  const initialUnlockedState = new Set();
  gameState.levels.forEach(level => {
    if (level.unlocked) {
      initialUnlockedState.add(level.level_number);
    }
  });

  // Set up polling as a fallback mechanism
  const startPaymentPolling = () => {
    console.log('Starting payment polling as fallback...');
    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 2 minutes (60 * 2 seconds)

    paymentCheckInterval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        console.log('Payment polling timeout reached');
        clearInterval(paymentCheckInterval);
        paymentCheckInterval = null;
        // Show manual check button
        showPaymentFallback();
        return;
      }

      try {
        console.log(`Payment poll ${pollCount}/${maxPolls}: Checking game state...`);
        const stateData = await apiCall("/game/state", null, "GET");

        // Check if the level was unlocked
        const levelWasUnlocked = stateData.levels && stateData.levels.some(
          level => level.level_number === levelNumber && level.unlocked
        );

        if (levelWasUnlocked && !initialUnlockedState.has(levelNumber)) {
          console.log('Payment detected via polling! Level was unlocked.');
          clearInterval(paymentCheckInterval);
          paymentCheckInterval = null;

          // Simulate the payment success data
          const mockTransactionData = {
            transaction_id: `polling_detected_${Date.now()}`,
            invoice: `polling_detected_${Date.now()}`,
            status: 'done'
          };

          handlePaymentSuccess(mockTransactionData, levelNumber);
        }
      } catch (error) {
        console.error('Error during payment polling:', error);
      }
    }, 2000); // Check every 2 seconds
  };

  window.XPayStationWidget.on(window.XPayStationWidget.eventTypes.STATUS, (event, data) => {
    console.log('Xsolla STATUS event received:', event, data);
    console.log('Status data details:', JSON.stringify(data));

    if (data && data.status === "done") {
      console.log('Payment completed successfully, calling handlePaymentSuccess...');
      // Stop polling since we got the event
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
        paymentCheckInterval = null;
      }
      handlePaymentSuccess(data, levelNumber);
    } else if (data && data.status) {
      console.log('Payment status:', data.status);
    }
  });

  window.XPayStationWidget.on(window.XPayStationWidget.eventTypes.CLOSE, () => {
    console.log('Xsolla widget closed');
    // Stop polling when widget closes
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval);
      paymentCheckInterval = null;
    }
    // Show manual check button if payment might have completed
    showPaymentFallback();
    closePaymentModal();
  });

  window.XPayStationWidget.on(window.XPayStationWidget.eventTypes.ERROR, (event, data) => {
    console.error('Xsolla ERROR event received:', event, data);
    // Stop polling on error
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval);
      paymentCheckInterval = null;
    }
    handlePaymentError(data);
  });

  // Also listen for the success event directly
  window.XPayStationWidget.on(window.XPayStationWidget.eventTypes.SUCCESS, (event, data) => {
    console.log('Xsolla SUCCESS event received:', event, data);
    console.log('Success data details:', JSON.stringify(data));
    // Stop polling since we got the event
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval);
      paymentCheckInterval = null;
    }
    handlePaymentSuccess(data, levelNumber);
  });

  console.log('Initializing Xsolla widget...');
  try {
    window.XPayStationWidget.init(options);
    console.log('Xsolla widget initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Xsolla widget:', error);
    alert('Failed to initialize payment widget. Please try again.');
    closePaymentModal();
    return;
  }

  console.log('Opening Xsolla widget...');
  try {
    window.XPayStationWidget.open();
    console.log('Xsolla widget opened successfully');
    // Start polling as a fallback mechanism
    startPaymentPolling();
  } catch (error) {
    console.error('Failed to open Xsolla widget:', error);
    alert('Failed to open payment widget. Please try again.');
    closePaymentModal();
  }
}

function showPaymentFallback() {
  const fallback = document.getElementById('paymentFallback');
  if (fallback) {
    fallback.classList.remove('hidden');
  }
}

async function checkPaymentStatus() {
  if (!currentPaymentLevel) {
    alert('No payment in progress to check.');
    return;
  }

  try {
    console.log('Manually checking payment status for level:', currentPaymentLevel);
    const stateData = await apiCall("/game/state", null, "GET");

    // Check if the level is unlocked
    const levelIsUnlocked = stateData.levels && stateData.levels.some(
      level => level.level_number === currentPaymentLevel && level.unlocked
    );

    if (levelIsUnlocked) {
      console.log('Payment confirmed! Level is unlocked.');
      const mockTransactionData = {
        transaction_id: `manual_check_${Date.now()}`,
        invoice: `manual_check_${Date.now()}`,
        status: 'done'
      };

      handlePaymentSuccess(mockTransactionData, currentPaymentLevel);
    } else {
      alert('Payment not yet processed. Please wait a moment and try again, or contact support if the issue persists.');
    }
  } catch (error) {
    console.error('Error checking payment status:', error);
    alert('Failed to check payment status. Please try again.');
  }
}

// Add event listener for manual payment check button
document.addEventListener('DOMContentLoaded', () => {
  const checkPaymentBtn = document.getElementById('checkPaymentBtn');
  if (checkPaymentBtn) {
    checkPaymentBtn.addEventListener('click', checkPaymentStatus);
  }
});

async function handlePaymentSuccess(transaction, levelNumber) {
  try {
    console.log('Payment success received:', transaction);
    console.log('Processing payment for level:', levelNumber);

    const transactionId = transaction.transaction_id || transaction.invoice || `local_${Date.now()}`;
    const amountCents = LEVEL_PRICES[levelNumber] || 299;

    console.log('Calling unlock-level-payment API:', {
      level_number: levelNumber,
      xsolla_payment_id: transactionId,
      amount_cents: amountCents
    });

    const result = await apiCall("/game/unlock-level-payment", {
      level_number: levelNumber,
      xsolla_payment_id: transactionId,
      amount_cents: amountCents,
    });

    console.log('API response:', result);

    // Add the payment amount as coins
    const coinsToAdd = amountCents;
    gameState.coins += coinsToAdd;
    totalCreditsEarned += coinsToAdd;

    console.log('Updated game state:', {
      coins: gameState.coins,
      levelNumber: levelNumber,
      coinsAdded: coinsToAdd
    });

    alert(`District ${levelNumber} unlocked. You received +${coinsToAdd} credits!`);
    closePaymentModal();

    // Load updated game state without switching views
    console.log('Loading updated game state...');
    const stateData = await apiCall("/game/state", null, "GET");
    console.log('Loaded game state:', stateData);

    gameState.upgrades = Array.isArray(stateData.upgrades) ? stateData.upgrades : [];
    gameState.levels = Array.isArray(stateData.levels) ? stateData.levels : [];
    // Use the server's coin balance to ensure sync
    gameState.coins = Number(result.coins ?? stateData.coins ?? gameState.coins);
    gameState.coinsPerSecond = Number(stateData.coins_per_second ?? gameState.coinsPerSecond);

    console.log('Final game state:', {
      coins: gameState.coins,
      coinsPerSecond: gameState.coinsPerSecond,
      levels: gameState.levels.length
    });

    updateUI();
    switchView("districts");
  } catch (error) {
    console.error("Payment success handling error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack
    });
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
