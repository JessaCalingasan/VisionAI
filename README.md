# VisionAI 📸🤖

A React Native (Expo) mobile application that captures photos using the device camera, sends them to **Google Gemini** for AI-powered multimodal analysis, and displays structured results — including object detection, scene context, activity recognition, and actionable recommendations.

## Features

- 📷 **Live Camera Capture** — Full-screen camera preview with instant photo capture
- 🧠 **Gemini Vision Analysis** — Multimodal AI analysis using Google's Gemini 2.5 Flash model
- 🎯 **Roboflow Object Detection** — Optional bounding-box object detection via COCO model
- 🎭 **Analysis Personas** — Choose from Academic, Safety Inspector, or Inventory Clerk perspectives
- 📜 **History Log** — Persistent analysis history powered by Supabase
- 🌙 **Premium Dark UI** — Sleek, modern dark-mode interface with smooth interactions

## Tech Stack

| Technology | Purpose |
|---|---|
| **Expo SDK 54** | React Native framework |
| **expo-camera** | Native camera access |
| **expo-file-system** | Base64 image conversion |
| **React Navigation** | Screen-to-screen routing |
| **Google Gemini API** | Multimodal vision AI |
| **Roboflow** | Object detection (optional) |
| **Supabase** | Persistent history storage (optional) |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo Go app on your mobile device
- Google Gemini API key ([Get one here](https://aistudio.google.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/JessaCalingasan/VisionAI.git
cd VisionAI

# Install dependencies
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
# Required
EXPO_PUBLIC_GEMINI_KEY=your_gemini_api_key

# Optional
EXPO_PUBLIC_ROBOFLOW_KEY=your_roboflow_key
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

### Running the App

```bash
# Start the Expo dev server
npx expo start
```

Scan the QR code with Expo Go on your phone to launch the app.

## Project Structure

```
├── App.js                  # Navigation stack configuration
├── lib/
│   ├── gemini.js           # Gemini API client & base64 conversion
│   ├── prompts.js          # Analysis persona prompt definitions
│   ├── roboflow.js         # Roboflow object detection client
│   └── supabase.js         # Supabase client with mock fallback
└── screens/
    ├── CameraScreen.jsx    # Camera preview & capture
    ├── PreviewScreen.jsx   # Photo review & persona selection
    ├── ResultScreen.jsx    # AI analysis results display
    └── HistoryScreen.jsx   # Saved analysis history
```

## App Flow

1. **Camera** → Capture a photo using the device camera
2. **Preview** → Review the photo and select an analysis persona
3. **Result** → View AI-generated structured analysis
4. **History** → Browse previously saved analyses

## License

This project is for educational purposes.
