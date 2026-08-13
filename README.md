# Real Time - AI Photo Frame 2

A modern, web-based photo frame application designed for viewing and managing AI-generated images and videos. Features a sleek glassmorphism UI with real-time updates, smart NSFW filtering, and responsive navigation. 

Powered by a modern React + Vite frontend and a blazing fast FastAPI backend with SQLite indexing.

![Version](https://img.shields.io/badge/version-2.0.23-blue)
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

### 🔍 Smart Features & Filtering
- **Real-time Monitoring** - Auto-detects new images via file system watcher with WebSocket broadcasts
- **Safe Only Mode** - Strict filtering mode that displays exclusively whitelisted files residing in the `/SAFE` directory
- **Keyword Filter** - Instant filtering based on prompt keywords and designated NSFW folder rules
- **AI Content Scan** - Automatic NSFW detection using NudeNet AI with configurable offsets and progress UI
- **Content Scan Current Folder** - Directly scan the currently active folder on demand from the Gallery toolbar right next to the search box
- **Customizable Header Toggles** - Enable or disable individual header toggle buttons (`Safe Only`, `Keyword Filter`, `Folder Lock`, `Content Scan`) via backend configuration settings
- **Dynamic Content Badges** - Visual indicators for NSFW (Red), Safe Mode Filtered (Yellow), and explicitly SAFE (Green) media
- **Metadata Extraction** - Permanent & quick metadata viewers displaying generation parameters (Prompts, Seed, Model, LoRAs). Includes instant Copy-to-Clipboard.
- **Manual Safe Mode Exclusions** - Easily whitelist safe files by moving them into a designated `/SAFE` directory
- **Granular Settings & Security** - Save UI settings, default values, security options, and passphrase locks entirely through the GUI

### 🎬 Advanced Video Player
- Plays MP4, WebM, MOV, AVI, MKV formats
- **Frame-by-Frame Navigation** - First, Previous, Next, Last frame controls for precision scrubbing
- **Frame Capture (📸)** - Export the exact current frame to a high-quality JPG via the backend API
- Mobile-responsive video controls with independent draggable scrubber
- Fullscreen and responsive `object-fit: contain` scaling

📋 See [CHANGELOG.md](CHANGELOG.md) for detailed updates and version history.

## 🎯 Usage

### Home Page
- **Hero Viewer & Thumbnail Navigation**: View the latest generated media in a large hero container while scrolling through recent items in the sidebar grid. Click any thumbnail or use **Previous/Next** buttons (and **keyboard arrow keys**) to navigate.
- **Media Type Filtering**: Filter between **All**, **Photos**, or **Videos** using the header's center pill control.
- **Header Security & Privacy Toggles**: Toggle **Safe Only** (show strictly whitelisted media in `/SAFE`), **Keyword Filter** (filter by prompt keywords), **Folder Lock** (hide NSFW subfolders), and **Content Scan** directly from the illuminated header buttons (customizable in settings).
- **Media Actions**: Delete media, toggle NSFW flags, or mark files as Safe directly from the active hero view.
  

<img src="https://github.com/user-attachments/assets/703f98bf-126a-4840-9604-c0231d6a9954" width="60%" alt="Description 2">

### Gallery
- **Directory & Grid Browsing**: Recursively navigate folders using interactive breadcrumbs and subfolder pills.
- **Search & Filter**: Search media by prompt text, seed, model name, or filename in real time.
- **Content Scan Current Folder**: Click the **Content Scan Current Folder** button located to the far right of the search box to perform an on-demand AI scan of the active directory with live progress feedback.
- **Grid Layout Controls**: Adjust thumbnail size scaling (`1` to `8`) for optimal density.
- **Split-View Preview**: Click any item to launch the side-by-side Hero preview panel for inspecting metadata, capturing video frames, or taking quick media actions.
  
<img src="https://github.com/user-attachments/assets/83403240-5489-4a67-84ee-6bd581d4c729" width="60%" alt="Description 2">

### Picture Frame Mode
- **Minimalist Full-Screen Display**: Optimized for smart displays, wall mounts, and slideshow viewing.
- **Real-Time Live Updates**: Automatically loads and transitions to brand-new AI generations as they arrive in monitored folders.
- **Display Controls**: Toggle full-screen mode or navigate back to the main interface with a single tap.
  
<img src="https://github.com/user-attachments/assets/fd5ad81f-7439-47c8-8852-403faf642afa" width="60%" alt="Description 2">


## 🔧 Filename Format

The application extracts metadata from AI-generated image filenames in this format:

```
YYYY-MM-DD.HH-MM-SS - seed - dimensions - model - prompt.extension
```

**Example:**
```
2025-12-12.14-30-45 - 123456 - 1024x1024 - stable-diffusion-xl - a beautiful sunset over mountains.jpg
```

**Extracted metadata:**
- Date/Time: `2025-12-12.14-30-45`
- Seed: `123456`
- Dimensions: `1024x1024`
- Model: `stable-diffusion-xl`
- Prompt: `a beautiful sunset over mountains`

## 🛡️ Safe Modes, Security & Customization

The application includes comprehensive privacy and security features:

1. **Safe Only Mode**: Hides all media unless it has been explicitly marked safe and moved to the `/SAFE` folder.
2. **Keyword Filter**: Filters media based on:
   - NSFW keywords in prompts (configured in `config.ini` / GUI settings)
   - NSFW folder names
3. **Folder Lock**: Hides content residing inside designated NSFW subfolders.
4. **Header Control Customization**: Individual header toggle buttons (`Safe Only`, `Keyword Filter`, `Folder Lock`, `Content Scan`) can be enabled or disabled via backend configuration settings (`ENABLE_*_OPTION`). Disabled options are automatically hidden from the header bar.
5. **Passphrase Locks**: Sensitive actions (Delete, Flag, Access Settings) and toggle switches can be secured with passphrases.




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

1. **Safe Only Mode**: Displays strictly whitelisted content residing in `/SAFE`.
2. **Keyword Filter**: Filters images/videos based on restricted keywords and explicitly named NSFW folders.
3. **Content Scanner**: Passively monitors incoming files. If enabled, flagged content is physically moved to an `NSFW` subfolder.
4. **SAFE Whitelisting**: Use the Shield/Safe button to permanently flag an image as safe, moving it to a `SAFE` folder where it bypasses future scans.
5. **Header Button Controls**: Enable or disable specific header buttons in backend configuration to customize visible security controls.
6. **Passphrase Locks**: Lock specific toggles (like Content Scan, Safe Only, or Keyword Filter) via Global Settings to prevent unauthorized changes.


