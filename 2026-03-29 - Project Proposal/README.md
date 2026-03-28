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

---

## 📌 Roadmap (Optional Section)
- [ ] Core movement & shooting  
- [ ] Procedural room generation  
- [ ] Enemy AI  
- [ ] Boss fight  
- [ ] Upgrade system  
- [ ] Main menu progression  
- [ ] SFX & music  
- [ ] Steam release prep  

---
