# 🎬 StreamBDIX
**Stremio addon for streaming from BDIX sites.**

---

## 🔍 What It Does

• Fetches movies and series from BDIX sites based on what you select in Stremio  
• Shows available streams with quality info (1080p, 4K, BluRay, etc.)  
• Lets you play directly in Stremio from BDIX

---

## ✅ Prerequisites

1. Install **[Node.js](https://nodejs.org/en/download)** (version 14 or higher)
2. Install **[Stremio](https://www.stremio.com/downloads)**

---

## ⚡ Step-by-Step Setup

### Step 1: Download the addon
```powershell
git clone https://github.com/YOUR_USERNAME/StreamBDIX.git
cd StreamBDIX
```

### Step 2: Install dependencies
```powershell
npm install
```

### Step 3: Start the server
```powershell
node index.js
```

You should see:
```
╔═══════════════════════════════════════════════════╗
║                    StreamBDIX                     ║
╠═══════════════════════════════════════════════════╣
║               http://127.0.0.1:7001               ║
║        Keep terminal open while streaming         ║
║               Press Ctrl+C to stop                ║
╚═══════════════════════════════════════════════════╝
```

### Step 4: Add to Stremio
1. Open Stremio
2. Click the **🔍 Addon** icon (puzzle piece)
3. Click **"+ Add an addon"**
4. Paste this URL: `http://127.0.0.1:7001/manifest.json`
5. Click **"Install"**

### Step 5: Configure sources (optional)
1. Open `http://127.0.0.1:7001` in your browser
2. Enable/disable sources as needed
3. Click **"Save"**

---

## 🌐 Sources

| Source | Type | Content |
|--------|------|---------|
| [DFLIX](https://discoveryftp.net/) | Domain | Movies & Series |
| **DhakaFlix-14** | 172.16.50.14 | English 1080p, Hindi, South Indian, Animation |
| **DhakaFlix-7** | 172.16.50.7 | English, Kolkata Bangla, Foreign, 3D |
| **DhakaFlix-12** | 172.16.50.12 | TV & WEB Series |
| **DhakaFlix-9** | 172.16.50.9 | Anime, Documentary, WWE |
| [RoarZone](https://roarzone.info) | Domain | Movies & Series |
| [FTPBD](https://ftpbd.net) | Domain | Movies & Series |
| [CircleFTP](http://new.circleftp.net) | Domain | Movies & Series |
| ICC FTP | 10.16.100.244 | Movies & Series |

---

## ☁️ Cloudflare Tunnel (Optional)
Access your addon from anywhere using Cloudflare Tunnel.

1. Install cloudflared: `npm install -g cloudflared`
2. Create a tunnel at [Cloudflare Zero Trust](https://one.dash.cloudflare.com)
3. Paste your tunnel token in the web UI

---

## ⚠️ Important

• **Keep the terminal open** — the addon must be running to fetch streams  
• **Run before starting Stremio** — the addon needs to be active when Stremio loads  
• Press **Ctrl+C** to stop the addon

---

## 🛠️ Troubleshooting

**No streams found?**  
• Make sure the addon is running (`node index.js`)  
• Check if the BDIX sites are reachable from your network  
• The content might not be available on the enabled sources

**Streams not playing?**  
• Try a different source/quality option  
• Check if your ISP allows access to the BDIX servers

**Server won't start?**  
• Make sure port 7001 is not in use  
• Run `npm install` to ensure all dependencies are installed

---

**Made for BDIX users**
