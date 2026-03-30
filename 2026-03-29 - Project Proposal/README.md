# 🍕 Enter the Oven  
*A dungeon‑crawling, top‑down shooter inspired by **Enter the Gungeon** and **Vampire Survivors***  

---

## 🎮 Overview
**Enter the Oven** is a fast‑paced roguelite shooter where you play as a heroic pizza slice fighting your way through a chaotic kitchen full of hostile food. Battle through randomly generated rooms, collect upgrades, defeat the Giant Pineapple boss, and grow stronger with permanent stat upgrades.

---

## 🌀 Game Loop
1. Enter a randomly generated dungeon floor  
2. Fight enemies and survive room‑to‑room  
3. Collect coins dropped by enemies  
4. Level up and choose random upgrades  
5. Defeat the floor boss  
6. Spend coins on permanent upgrades in the main menu  
7. Repeat and push further  

---

## 🎨 Art Direction
- Pixel art style  
- **Main Character:** Pizza slice  
- **Enemies:** Pineapple slices, Meatball, Fish, Mini Oven  
- **Boss:** Giant Pineapple  

---

## 🗺️ Level Design
- Interconnected rooms  
- Random generation for replayability  
- Square/rectangle layouts  
- Fire tiles that damage the player  

---

## 🍕 Main Character Stats
| Stat | Value |
|------|--------|
| HP | 5 |
| Speed | TBD |
| Dodge | 0% |
| Luck | 0% |
| Shield Cooldown | 15 sec |
| Shield HP | 1 hit |
| Crit Chance | 5% |
| Crit Damage | 10% |
| XP Gain | 0% |

---

## 👾 Enemy Details

### **Pineapple Slice**
- Melee  
- Follows player  
- Faster than player  
- **HP:** 8  
- **Damage:** 3  

### **Meatball**
- Melee  
- Slow when idle  
- Charges in straight line  
- Predicts player movement  
- **HP:** 10  
- **Damage:** 5  

### **Fish**
- Ranged (water drops)  
- Shoots at current player position  
- Slower than player  
- **HP:** 6  
- **Damage:** 2  

### **Mini Oven**
- Ranged (fireball drop)  
- Predicts movement  
- Slower than player  
- **HP:** 7  
- **Damage:** 10  

---

## 🍍 Boss: Giant Pineapple  
**Total HP:** 150  

### Basic Attacks
- Spike shot (3 dmg)  
- 360° spike burst (3 dmg)  
- Random floor spikes (4 dmg)  
- Straight‑line floor spikes (4 dmg)  

### Special Attacks
- Summons 3 pineapple slices  
- Rolling charge (5 dmg)  
- Triple stomp at player position (5 dmg each)  

### HP‑Based Phases
#### **150 HP**
- 3 basic attacks between specials  
- Base projectile speed  

#### **100 HP**
- 2 basic attacks between specials  
- Faster projectiles  

#### **50 HP — Enraged**
- 1–2 basic attacks between specials  
- Faster projectiles  
- Increased damage  
- Faster special attacks  

---

## 🔫 Weapons

### **Handgun**
- Damage: 1  
- Attack Speed: 2 bullets/s  
- 1 projectile  

### **Shotgun**
- Damage: 1 per pellet  
- 3‑pellet cone  
- Attack Speed: 1 shot/s  

### **Rocket Launcher**
- Damage: 3  
- Slow projectile  
- Attack Speed: 0.5 rockets/s  

---

## 🛠️ Main Menu Upgrades  
*(5 levels each unless noted)*  

### Character Upgrades
- +2 HP per level  
- Speed (TBD)  
- +2% Dodge per level  
- +5% Luck per level  
- –1s Shield Cooldown per level  
- Shield HP: 1 → 3 hits (3 levels)  
- +5% Crit Chance per level  
- +10% Crit Damage per level  
- +5% XP Gain per level  

### Weapon Upgrades (3 levels each)
**Handgun**
- +1 dmg per level  
- Faster attack speed  

**Shotgun**
- +1 dmg per pellet per level  
- Faster attack speed  

**Rocket Launcher**
- +2 dmg per level  
- Faster attack speed  

---

## ⭐ In‑Game Upgrade System  
Every **5 levels**, choose a **Rare or Legendary** upgrade.

### Character Upgrades

#### Common
- +1 Max HP  
- Speed increase  
- +1%–5% Luck  

#### Rare
- +5% Dodge  
- Reduced shield cooldown  
- Extra coins per kill  
- Extra XP per kill  

#### Legendary
- Free revive  
- Free invulnerability hit every 30 sec  

---

## 🔥 Weapon Upgrades

### Common

#### Handgun
- +3%–6% damage  
- +1%–5% attack speed  

#### Shotgun
- Increase to 5 pellets  
- Reduce cone spread (5%–10%)  
- +1%–5% attack speed  

#### Rocket Launcher
- +1%–5% damage  
- +1%–3% attack speed  

### Rare
- +1%–5% all weapon damage  
- Bullets slow enemies  
- Bullets slow enemy attack speed  
- Burn effect (1 dmg/s)  
- Faster projectile speed  

### Legendary
- Lifesteal  
- Bullets bounce once  
- Bullets pierce enemies  
- +10% weapon damage  
- +15% attack speed  

## Technologies Used

- GitHub
  - Version control, Project Submission 
- HTML and CSS
  - Layout / Styling for the web application
- JavaScript / Node / Express
  - Code for website / back end functionality
  - Node / Express for serving the content
- MongoDB
  - Simple database that can directly store JSON objects for game data
- Docker
  - Use for creating container for deployment

## Project Structure Proposal (To be changed)
 
```text
my-oven-game/
│
├── client/                              # frontend files served to the browser
│   ├── index.html                       # main game page
│   ├── play.html                        # page for playing a live game
│   ├── history.html                     # page listing past games
│   ├── replay.html                      # page for viewing a replay
│   │
│   ├── css/
│   │   ├── styles.css                   # shared global styles
│   │   ├── play.css                     # styles for play screen
│   │   ├── history.css                  # styles for past games page
│   │   └── replay.css                   # styles for replay screen
│   │
│   ├── js/
│   │   ├── main.js                      # shared startup logic
│   │   ├── play.js                      # live game logic in the browser
│   │   ├── history.js                   # loads and displays past games
│   │   ├── replay.js                    # replay controls and playback
│   │   ├── board.js                     # board rendering and interaction
│   │   └── ui.js                        # status text, buttons, move list, etc.
│   │
│   └── assets/
│       ├── images/
│       │   ├── board/                   # board graphics
│       │   └── pieces/                  # chess piece images
│       └── audio/
│           ├── move.wav                 # move sound
│           ├── capture.wav              # capture sound
│           └── check.wav                # check sound
│
├── server/                              # Node backend
│   ├── server.js                        # express setup, static serving, API mounting
│   ├── db.js                            # MongoDB connection setup
│   ├── package.json                     # backend dependencies and scripts
│   ├── .env                             # environment variables
│   │
│   ├── api/
│   │   ├── auth.js                      # login/register routes
│   │   ├── games.js                     # save/load/list completed games
│   │   └── ai.js                        # route for requesting an AI move
│   │
│   ├── models/
│   │   ├── User.js                      # user account schema
│   │   └── Game.js                      # saved game + move history schema
│   │
│   ├── chess/
│   │   ├── ChessGame.js                 # board state, legal moves, rules, move application
│   │   └── ChessAI.js                   # AI search + evaluation in one file
│   │
│   └── utils/
│       └── auth.js                      # password hashing / token helpers
│
├── docker/
│   ├── Dockerfile                       # container for Node app
│   └── docker-compose.yml               # runs app + MongoDB together
│
├── .gitignore                           # ignores .env, node_modules, etc.
└── README.md                            # project overview and setup instructions
```
# Enemy AI System

## Swarm Director

This is the "non-trivial" part that makes the system feel alive. One singleton object reads the global state each wave and assigns roles to enemy groups: aggressors, flankers, distractors, and harassers. It can throttle how many enemies chase the player directly to prevent mob-piling, and it can trigger elite enemies when the player has been too comfortable for too long. Think of it as a dungeon master reacting to player performance — if the player is kiting clockwise and never taking damage, the director spawns a flanker group to cut off the angle.

## Utility AI

Instead of a rigid state machine, each enemy scores several candidate actions every frame (attack, reposition, dodge, seek cover) and picks the highest score. Scores are computed from weighted inputs: distance to player, current health ratio, nearby bullet density, time-since-last-attack cooldown. This produces nuanced behavior that emerges from the numbers rather than hand-authored rules. A low-health enemy naturally starts scoring "retreat" higher. An enemy behind cover scores "fire" higher. It's cheap to tune and produces surprising results.

## Behavior Tree

The behavior tree executes whatever the utility scorer chose, but also handles real-time interrupts. If the player fires a wide-spread shot, interrupt nodes can trigger an immediate dodge even mid-attack. Flocking rules (separation, alignment, cohesion) live here too — they keep enemies from piling on the same pixel, which is a huge visual quality-of-life win in bullet-hell style games.
