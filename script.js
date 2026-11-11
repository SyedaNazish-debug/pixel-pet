"use strict";

const STORAGE_KEY = "pixel-pet-simulator-v1";
const STAT_NAMES = ["hunger", "happiness", "energy", "cleanliness"];
const DEFAULT_STATS = {
  hunger: 80,
  happiness: 80,
  energy: 80,
  cleanliness: 80,
};

const ACTIONS = {
  feed: {
    changes: { hunger: 22, happiness: 5, cleanliness: -4 },
    reaction: "bounce",
    messages: [
      "Nom nom! Pip loved that snack!",
      "Pip inhaled that berry. Very dignified.",
      "Snack secured. Pip is now 3% fluffier.",
    ],
  },
  play: {
    changes: { happiness: 22, energy: -16, hunger: -10, cleanliness: -7 },
    reaction: "wiggle",
    messages: [
      "Best playtime ever! What a wiggle!",
      "Pip has defeated the suspiciously bouncy ball!",
      "That zoomie had absolutely no destination.",
    ],
  },
  sleep: {
    changes: { energy: 30, hunger: -7 },
    reaction: "sleeping",
    messages: [
      "Sweet dreams, little Pip... zZz",
      "Pip is buffering. Please do not boop.",
      "One tiny snooze, coming right up.",
    ],
  },
  clean: {
    changes: { cleanliness: 30, happiness: 5 },
    reaction: "sparkle-pop",
    messages: [
      "Squeaky clean and feeling fresh!",
      "Pip smells like a very polite cloud.",
      "Bath complete. Puddle investigated.",
    ],
  },
};

const PET_PIXELS = [
  "................",
  "....OOOO..OOOO..",
  "...OYYYYOOYYYYO.",
  "..OYYYYYYYYYYYO.",
  ".OYYYYYYYYYYYYYO",
  ".OYYYYYYYYYYYYYO",
  "OYYYYYYYYYYYYYYYO",
  "OYYEEYYYYYYEEYYYO",
  "OYYEEYYYYYYEEYYYO",
  "OYYYYYYYYYYYYYYYO",
  "OYYYYYMMMMYYYYYYO",
  ".OYYYYMMMMYYYYYO.",
  ".OYYYYYYYYYYYYYO.",
  "..OYYYYYYYYYYYO..",
  "...OYYYYYYYYYO...",
  "....OOOOOOOO....",
];

const PIXEL_COLORS = {
  O: "#75533f",
  Y: "#f6c95d",
};

const EXPRESSIONS = {
  Happy: [
    [8, 4], [9, 5], [8, 13], [9, 12],
    [11, 8, "#e9828b"], [12, 9, "#e9828b"], [11, 10, "#e9828b"],
  ],
  Sad: [
    [8, 4], [9, 4], [8, 13], [9, 13],
    [11, 9, "#e9828b"], [12, 8, "#e9828b"], [12, 10, "#e9828b"],
  ],
  Hungry: [
    [7, 4], [8, 5], [7, 13], [8, 12],
    [11, 8, "#493c57"], [11, 10, "#493c57"], [12, 9, "#e9828b"],
  ],
  Sleepy: [
    [9, 4], [9, 5], [9, 12], [9, 13],
    [11, 9, "#e9828b"],
  ],
  Messy: [
    [8, 4], [9, 5], [8, 12], [9, 13],
    [11, 8, "#493c57"], [12, 9, "#e9828b"], [11, 10, "#493c57"],
  ],
  Okay: [
    [8, 4], [8, 5], [8, 12], [8, 13],
    [11, 9, "#e9828b"],
  ],
};

const petElement = document.querySelector("#pet");
const moodElement = document.querySelector("#mood");
const moodMessageElement = document.querySelector("#mood-message");
const actionButtons = document.querySelectorAll(".action-button");
const faceLayer = document.createElement("span");
let reactionTimer;
let storageWarning = "";
let stats = loadStats();

function loadStats() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) return { ...DEFAULT_STATS };

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Saved pet data must be an object.");
    }

    return Object.fromEntries(
      STAT_NAMES.map((name) => {
        const value = parsed[name];
        return [
          name,
          Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : DEFAULT_STATS[name],
        ];
      }),
    );
  } catch (error) {
    console.error("Could not load saved pet stats:", error);
    storageWarning = "Saved data could not be loaded; starting fresh.";
    return { ...DEFAULT_STATS };
  }
}

function saveStats() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    storageWarning = "";
    return true;
  } catch (error) {
    console.error("Could not save pet stats:", error);
    storageWarning = "Your browser couldn't save this visit.";
    return false;
  }
}

function renderPet() {
  PET_PIXELS.forEach((row, rowIndex) => {
    [...row].forEach((pixel, columnIndex) => {
      if (pixel === ".") return;
      if (pixel === "E" || pixel === "M") return;
      const tile = document.createElement("span");
      tile.className = "pixel";
      tile.style.gridArea = `${rowIndex + 1} / ${columnIndex + 1}`;
      tile.style.backgroundColor = PIXEL_COLORS[pixel];
      petElement.append(tile);
    });
  });

  faceLayer.className = "pet-face";
  faceLayer.setAttribute("aria-hidden", "true");
  petElement.append(faceLayer);
}

function updateExpression(moodName) {
  const expression = EXPRESSIONS[moodName] ? moodName : "Okay";
  faceLayer.replaceChildren();
  EXPRESSIONS[expression].forEach(([row, column, color = "#493c57"]) => {
    const pixel = document.createElement("span");
    pixel.className = "pixel face-pixel";
    pixel.style.gridArea = `${row} / ${column}`;
    pixel.style.backgroundColor = color;
    faceLayer.append(pixel);
  });
  petElement.setAttribute("data-expression", expression.toLowerCase());
}

function getMood() {
  if (stats.hunger <= 25) return { name: "Hungry", message: "Pip's tummy is rumbling!", color: "#e8a43e" };
  if (stats.energy <= 25) return { name: "Sleepy", message: "A cozy nap would feel nice.", color: "#8877c6" };
  if (stats.cleanliness <= 25) return { name: "Messy", message: "Pip could use a little bath.", color: "#d98a79" };
  if (stats.happiness <= 25) return { name: "Sad", message: "A little love could cheer Pip up.", color: "#e17b91" };
  if (Math.min(...STAT_NAMES.map((name) => stats[name])) >= 70) {
    return { name: "Happy", message: "Ready for a little adventure!", color: "#75cba9" };
  }
  return { name: "Okay", message: "Pip's doing just fine.", color: "#75cba9" };
}

function updateDisplay() {
  document.querySelectorAll(".stat-row").forEach((row) => {
    const name = row.dataset.stat;
    const value = stats[name];
    const fill = row.querySelector(".stat-fill");
    const track = row.querySelector(".stat-track");

    fill.style.width = `${value}%`;
    fill.style.backgroundColor = value <= 25 ? "#ee8294" : value <= 50 ? "#f0bf59" : "#75cba9";
    track.setAttribute("aria-valuenow", String(value));
    row.querySelector(".stat-value").textContent = String(value);
  });

  const mood = getMood();
  moodElement.textContent = mood.name;
  moodMessageElement.textContent = storageWarning || mood.message;
  document.querySelector(".mood-dot").style.backgroundColor = mood.color;
  petElement.setAttribute("data-mood", mood.name.toLowerCase());
  updateExpression(mood.name);
  petElement.setAttribute("aria-label", `Your pixel pet, Pip. ${mood.name}.`);
}

function applyAction(actionName, button) {
  const action = ACTIONS[actionName];
  if (!action) return;

  Object.entries(action.changes).forEach(([name, amount]) => {
    stats[name] = Math.min(100, Math.max(0, stats[name] + amount));
  });

  updateDisplay();
  const saved = saveStats();
  const message = action.messages[Math.floor(Math.random() * action.messages.length)];
  moodMessageElement.textContent = saved ? message : storageWarning;

  window.clearTimeout(reactionTimer);
  petElement.classList.remove("bounce", "wiggle", "sleeping", "sparkle-pop");
  button.classList.remove("is-pressed");
  void petElement.offsetWidth;
  petElement.classList.add(action.reaction);
  button.classList.add("is-pressed");

  window.setTimeout(() => button.classList.remove("is-pressed"), 180);
  reactionTimer = window.setTimeout(() => {
    petElement.classList.remove(action.reaction);
    updateDisplay();
  }, 720);
}

renderPet();
updateDisplay();
actionButtons.forEach((button) => {
  button.addEventListener("click", () => applyAction(button.dataset.action, button));
});
