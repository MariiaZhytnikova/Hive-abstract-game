# 🐝 Hive Game (TypeScript)

**Live Demo**: [https://marinezh.github.io/Hive-abstract-game/](https://marinezh.github.io/Hive-abstract-game/)

or

[https://mariiazhytnikova.github.io/Hive-abstract-game/](https://mariiazhytnikova.github.io/Hive-abstract-game/)

Implementation of the classic abstract board game **Hive** using TypeScript, HTML5 canvas and simple game logic.  
This was developed as a Rush project at **Hive School** (42 Helsinki).  

---

## 🎮 About the Game

Hive is an abstract strategy game for two players, similar in depth to Chess or Go, but played without a board.  
Players take turns placing or moving their insect pieces. The goal is to **completely surround the opponent’s Queen Bee**.

Main features of this implementation:
- Two-player game (White vs Black).
- Rules enforced:
  - Queen Bee must be placed by the 4th turn.
  - New pieces must touch at least one of your own pieces (with exceptions for the first 2 moves).
  - No placing pieces directly adjacent to the opponent’s hive (until connected).
  - The hive must always stay intact (no breaking into two groups).
  - Correct movement logic for Beetle, Grasshopper, Spider, Ant, Queen Bee.
- Win detection when a Queen Bee is surrounded.
- Interactive HTML5 canvas board with drag & drop placement.
- Popup windows for rules and win messages.

---

## 📜 Rules Recap

1. **Placement**  
   - First piece (White) can go anywhere.  
   - Second piece (Black) must be placed adjacent to the first.  
   - Later pieces must touch at least one of your own and may not touch an opponent directly.  

2. **Queen Bee**  
   - Must be placed by your **4th turn**.  
   - No moving pieces until your Queen is on the board.  

3. **One Hive Rule**  
   - All pieces must form a single continuous group.  
   - You cannot move a piece if doing so would split the hive.  

4. **Freedom to Move**  
   - Sliding pieces require space to move in/out of a hex.  

5. **Stacking (Beetle)**  
   - Beetles can climb on top of other pieces.  
   - Only the top piece of a stack is active.  

6. **Win Condition**  
   - If a Queen Bee is surrounded on all 6 sides, that player loses.  

---

## 🛠️ Installation & Run

Clone the repository and install dependencies:

```bash
git clone https://github.com/<your-username>/Hive-abstract-game.git
cd Hive-abstract-game
npm install
```

Run in dev mode with Vite:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Open in browser at: [http://localhost:5173](http://localhost:5173)

---

## 🚀 Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages using the `gh-pages` package.

### 🔧 Deployment Setup

The project includes the following deployment configuration:

**1. Vite Configuration (`vite.config.ts`)**
```typescript
export default defineConfig({
  base: '/Hive-abstract-game/', // GitHub Pages subdirectory
});
```

**2. Package.json Scripts**
```json
{
  "scripts": {
    "deploy": "gh-pages -d dist"
  },
  "devDependencies": {
    "gh-pages": "^6.3.0"
  }
}
```

**3. GitHub Pages Settings**
- **Source**: Deploy from a branch
- **Branch**: `gh-pages`
- **Folder**: `/ (root)`

### 📦 Deployment Process

**Step 1: Build the Project**
```bash
npm run build
```

**Step 2: Deploy to GitHub Pages**
```bash
npm run deploy
```

**Step 3: Access Your Live Site**
```
https://<your-username>.github.io/Hive-abstract-game/
```

### 🔍 Technical Implementation Details

#### Asset Path Resolution
The deployment handles different asset paths between development and production:

```typescript
// Dynamic asset path detection
function getAssetPath(filename: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/';
  return `${baseUrl}assets/${filename}`;
}
```

- **Development**: `./assets/image.png`
- **Production**: `/Hive-abstract-game/assets/image.png`

#### Image Loading Validation
Canvas operations include proper image loading checks:

```typescript
// Ensure images are fully loaded before drawing
if (img.complete && img.naturalHeight !== 0) {
  ctx.drawImage(img, x, y, width, height);
}
```

#### Production-Safe Code
Queen Bee detection works in both development and minified production:

```typescript
// Dual property checking (constructor names get minified)
const isQueen = piece.constructor.name === "QueenBee" || piece.type === "bee";
```

### 🛠️ Troubleshooting Deployment

**Problem: Images not loading (404 errors)**
- **Cause**: Hardcoded asset paths
- **Solution**: Use dynamic `getAssetPath()` function

**Problem: Canvas InvalidStateError**
- **Cause**: Drawing images before they load
- **Solution**: Check `img.complete` before canvas operations

**Problem: Old version still showing**
- **Cause**: Browser/CDN caching
- **Solution**: Hard refresh (`Cmd+Shift+R`) or incognito mode
```bash
rm -rf dist && npm run build && npm run deploy

### 🔄 Complete Deployment Workflow

```bash
# Clean build and deploy
rm -rf dist
npm run build
npm run deploy

# Or use the combined command
npm run build && npm run deploy
```

The `gh-pages` package automatically:
1. Creates/updates the `gh-pages` branch
2. Copies built files from `dist/` folder
3. Pushes to GitHub repository
4. Triggers GitHub Pages rebuild

---

## ✨ Features to Add (Future Work)

- Online multiplayer.  
- Drag and drop moves.  

---
# Test deployment
