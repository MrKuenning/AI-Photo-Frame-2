# Real Time - AI Photo Frame 2

A modern, web-based photo frame application designed for viewing and managing AI-generated images and videos. Features a sleek glassmorphism UI with real-time updates, smart NSFW filtering, and responsive navigation. 

Powered by a modern React + Vite frontend and a blazing fast FastAPI backend with SQLite indexing.

![Version](https://img.shields.io/badge/version-2.0.5-blue)
![Python](https://img.shields.io/badge/python-3.8+-green)
![FastAPI](https://img.shields.io/badge/fastapi-0.104+-teal)
![React](https://img.shields.io/badge/react-18-blue)

## ✨ Features

### 📸 Three Viewing Modes
- **Home Page** - Latest media hero view with responsive grid structure
- **Gallery** - Dynamic reflowing grid layout with recursive folder navigation and live preview panel
- **Picture Frame** - Minimalist full-screen slideshow mode with integrated native fullscreen support

### 🎨 Modern UI
- Fully responsive glassmorphism design optimized for all screen sizes (Mobile, Tablet, Desktop)
- Dynamic thumbnail aspect ratio toggling (`Square` or `Original`)
- Illuminated Pill-Style toggles for application states
- Monotone SVG Iconography for a clean, sleek look

### 🔍 Smart Features
- **Real-time Monitoring** - Auto-detects new images via file system watcher with WebSocket broadcasts
- **AI Content Scan** - Automatic NSFW detection using NudeNet AI with configurable offsets and progress UI
- **Dynamic Content Badges** - Visual indicators for NSFW (Red), Safe Mode Filtered (Yellow), and explicitly SAFE (Green) media
- **Metadata Extraction** - Permanent & quick metadata viewers displaying generation parameters (Prompts, Seed, Model, LoRAs). Includes instant Copy-to-Clipboard.
- **Manual Safe Mode Exclusions** - Easily whitelist safe files by moving them into a designated `/SAFE` directory
- **Granular Settings** - Save UI settings, default values, and backend configurations entirely through the GUI

### 🎬 Advanced Video Player
- Plays MP4, WebM, MOV, AVI, MKV formats
- **Frame-by-Frame Navigation** - First, Previous, Next, Last frame controls for precision scrubbing
- **Frame Capture (📸)** - Export the exact current frame to a high-quality JPG via the backend API
- Mobile-responsive video controls with independent draggable scrubber
- Fullscreen and responsive `object-fit: contain` scaling

📋 See [CHANGELOG.md](CHANGELOG.md) for detailed updates and version history.

## 📋 Requirements

- Python 3.8 or higher
- Node.js 18+ (for frontend compilation)
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Windows, macOS, or Linux

## 🚀 Installation

### 1. Clone or Download
```bash
git clone https://github.com/MrKuenning/AI-Photo-Frame
```

### 2. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies & Build
```bash
cd frontend
npm install
npm run build
```
*(On Windows, you can simply run the included `Frontend - Compile.bat` file from the root directory).*

### 4. Configure
Edit `backend/config.ini` (or copy `config-example.ini` if starting fresh) to set your monitored folder:
```ini
[App]
IMAGE_FOLDER = E:\AI\Output
PORT = 5002
```

### 5. Run Server
Run the included batch file from the root directory:
```bash
Start Server.bat
```
*(Or manually run `python main.py` inside the `backend/` directory).*

### 6. Open Browser
Navigate to: `http://localhost:5002`

## 📂 Project Structure

```text
App1 - Photo Frame 6/
├── Start Server.bat         # Production backend startup script
├── Frontend - Compile.bat   # Production frontend build script
├── CHANGELOG.md             # Detailed version history
│
├── backend/                 # FastAPI Server Logic
│   ├── main.py              # Application entry point
│   ├── config.py            # Configuration management
│   ├── database.py          # SQLite database and indexing
│   ├── watcher.py           # File system monitoring
│   ├── content_scanner.py   # AI NudeNet content scanning
│   ├── metadata_extractor.py# Metadata reading (A1111/WanGP)
│   ├── requirements.txt     # Python dependencies
│   └── routers/             # API routing endpoints
│
└── frontend/                # React + Vite UI
    ├── package.json         # Node dependencies
    ├── vite.config.js       # Vite configuration with backend proxying
    └── src/
        ├── components/      # Modular React UI components
        ├── pages/           # Main application views (Home, Gallery, Frame)
        ├── hooks/           # Custom React hooks (WebSockets, API)
        └── assets/          # Static styles and SVG icons
```

## 🔧 Filename Format & Metadata

The application extracts metadata directly from embedded file EXIF/PNG chunks, or gracefully falls back to filenames formatted as:
`YYYY-MM-DD.HH-MM-SS - seed - dimensions - model - prompt.extension`

## 🛡️ Safe Mode & Privacy

1. **Safe Mode Toggle**: Filters images/videos based on restricted keywords and explicitly named NSFW folders.
2. **Content Scanner**: Passively monitors incoming files. If enabled, flagged content is physically moved to an `NSFW` subfolder.
3. **SAFE Whitelisting**: Use the Shield/Safe button to permanently flag an image as safe, moving it to a `SAFE` folder where it bypasses future scans.
4. **Passphrase Locks**: Lock specific toggles (like Content Scan or Safe Mode) via the Global Settings to prevent unauthorized changes.
