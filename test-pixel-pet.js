"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "script.js"), "utf8");
const statNames = ["hunger", "happiness", "energy", "cleanliness"];

function createGame(storage = new Map(), random = Math.random) {
  const rows = statNames.map((name) => {
    const nodes = {
      ".stat-fill": { style: {} },
      ".stat-track": { setAttribute() {} },
      ".stat-value": { textContent: "" },
    };
    return {
      dataset: { stat: name },
      querySelector: (selector) => nodes[selector],
      value: () => Number(nodes[".stat-value"].textContent),
    };
  });
  const attributes = {};
  const pet = {
    classList: { add() {}, remove() {} },
    append() {},
    setAttribute(name, value) { attributes[name] = value; },
  };
  const mood = { textContent: "" };
  const message = { textContent: "" };
  const moodDot = { style: {} };
  const handlers = {};
  const buttons = ["feed", "play", "sleep", "clean"].map((action) => ({
    dataset: { action },
    classList: { add() {}, remove() {} },
    addEventListener(_event, handler) {
      handlers[action] = handler;
    },
  }));
  const elements = {
    "#pet": pet,
    "#mood": mood,
    "#mood-message": message,
    ".mood-dot": moodDot,
  };
  const document = {
    querySelector: (selector) => elements[selector],
    querySelectorAll: (selector) => selector === ".stat-row" ? rows : buttons,
    createElement: () => ({ style: {}, setAttribute() {}, append() {}, replaceChildren() {} }),
  };
  const window = {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    clearTimeout() {},
    setTimeout: () => 1,
  };

  const math = Object.create(Math);
  math.random = random;
  vm.runInNewContext(source, { document, window, console, Math: math });

  return {
    click: (action) => handlers[action](),
    stats: () => Object.fromEntries(rows.map((row) => [row.dataset.stat, row.value()])),
    expression: () => attributes["data-expression"],
    mood: () => attributes["data-mood"],
    message: () => message.textContent,
  };
}

function gameWithStats(stats) {
  const storage = new Map([["pixel-pet-simulator-v1", JSON.stringify(stats)]]);
  return createGame(storage);
}

const tests = [
  ["Feed updates hunger, happiness, and cleanliness", () => {
    const game = createGame();
    game.click("feed");
    assert.deepEqual(game.stats(), { hunger: 100, happiness: 85, energy: 80, cleanliness: 76 });
  }],
  ["Play updates hunger, happiness, energy, and cleanliness", () => {
    const game = createGame();
    game.click("play");
    assert.deepEqual(game.stats(), { hunger: 70, happiness: 100, energy: 64, cleanliness: 73 });
  }],
  ["Sleep restores energy and reduces hunger", () => {
    const game = createGame();
    game.click("sleep");
    assert.deepEqual(game.stats(), { hunger: 73, happiness: 80, energy: 100, cleanliness: 80 });
  }],
  ["Clean restores cleanliness and increases happiness", () => {
    const game = createGame();
    game.click("clean");
    assert.deepEqual(game.stats(), { hunger: 80, happiness: 85, energy: 80, cleanliness: 100 });
  }],
  ["Stats save to and restore from LocalStorage", () => {
    const storage = new Map();
    const firstVisit = createGame(storage);
    firstVisit.click("feed");
    assert.deepEqual(JSON.parse(storage.get("pixel-pet-simulator-v1")), firstVisit.stats());

    const refreshedVisit = createGame(storage);
    assert.deepEqual(refreshedVisit.stats(), firstVisit.stats());
  }],
  ["Expressions reflect Happy, Sad, Hungry, Sleepy, and Messy moods", () => {
    assert.equal(gameWithStats({}).expression(), "happy");
    assert.equal(gameWithStats({ happiness: 20 }).expression(), "sad");
    assert.equal(gameWithStats({ hunger: 20 }).expression(), "hungry");
    assert.equal(gameWithStats({ energy: 20 }).expression(), "sleepy");
    assert.equal(gameWithStats({ cleanliness: 20 }).expression(), "messy");
  }],
  ["Expression updates automatically when an action changes mood", () => {
    const game = createGame();
    assert.equal(game.expression(), "happy");
    for (let count = 0; count < 4; count += 1) game.click("play");
    assert.equal(game.mood(), "sleepy");
    assert.equal(game.expression(), "sleepy");
  }],
  ["Interactions can show different random funny messages", () => {
    let roll = 0;
    const game = createGame(new Map(), () => roll);
    game.click("feed");
    const firstMessage = game.message();
    roll = 0.99;
    game.click("feed");
    assert.notEqual(game.message(), firstMessage);
  }],
];

let failures = 0;
for (const [name, test] of tests) {
  try {
    test();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}\n${error.stack}`);
  }
}

console.log(`\n${tests.length - failures}/${tests.length} tests passed.`);
if (failures > 0) process.exitCode = 1;
