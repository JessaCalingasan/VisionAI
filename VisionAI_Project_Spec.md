# VisionAI — Project Build Spec

> Agentic build instructions for a React Native (Expo) mobile app that captures a photo, sends it to Google Gemini for multimodal analysis, and displays structured results. Optional phases add Roboflow object detection and Supabase history persistence.

Use this file as the authoritative spec when scaffolding the project. Build phase-by-phase, in order — later phases assume earlier screens and files already exist and work. After each phase, run the checkpoint checks before continuing.

---

## 0. Project Overview

**Goal:** A mobile app that opens the device camera, captures a photo, sends it to Gemini Vision, and displays a structured AI analysis (objects, context, activity, recommendations).

**Base:** Existing Expo project (React Native + Expo). If none exists, run `npx create-expo-app`.

**Core stack**
- Expo (React Native)
- `expo-camera` — native camera access
- `expo-file-system` — base64 image conversion
- `@react-navigation/native` + `native-stack` — screen navigation
- Google Gemini API (`gemini-2.0-flash:generateContent`) — multimodal vision analysis
- (Optional) Roboflow hosted inference — bounding-box object detection
- (Optional) Supabase — persisted analysis history

**Screens to build:** `CameraScreen.jsx` → `PreviewScreen.jsx` → `ResultScreen.jsx` (+ optional `HistoryScreen.jsx`)

**Lib modules to build:** `lib/gemini.js`, (optional) `lib/roboflow.js`, (optional) `lib/supabase.js`

---

## Phase 1 — Setup

1. Confirm an Expo project exists and runs: `npx expo start` shows the app in Expo Go.
2. Install the camera package with the Expo-aware installer (not plain npm, to avoid SDK version mismatches):
   ```bash
   npx expo install expo-camera
   ```
3. Fully restart the dev server after installing (stop and re-run `npx expo start`) — don't rely on Fast Refresh for native modules.
4. Create a Gemini API key at Google AI Studio (aistudio.google.com) → "Get API key" → "Create API key".
5. Create a `.env` file at the project root:
   ```
   EXPO_PUBLIC_GEMINI_KEY=your_key_here
   ```
   - The `EXPO_PUBLIC_` prefix is required for Expo to expose the variable to client JS.
   - Add `.env` to `.gitignore` immediately, before the first commit.
   - Restart `npx expo start` after creating/editing `.env`.
6. Read the key in code via `process.env.EXPO_PUBLIC_GEMINI_KEY`.

**Checkpoint**
- [ ] `npx expo install expo-camera` completed cleanly
- [ ] `.env` exists, contains `EXPO_PUBLIC_GEMINI_KEY`, and is gitignored
- [ ] `console.log(process.env.EXPO_PUBLIC_GEMINI_KEY)` prints the real key after restart

---

## Phase 2 — Camera Fundamentals

**File:** `CameraScreen.jsx`

Build a full-screen live camera preview with an overlaid capture button, using three render states:
1. `permission === null` → return an empty `View` (still loading)
2. `!permission.granted` → centered text "We need your permission to use the camera" + button calling `requestPermission`
3. `permission.granted` → full-screen `CameraView` (`facing="back"`) with a circular "Capture" button absolutely positioned near the bottom

```javascript
import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [photo, setPhoto] = useState(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          We need your permission to use the camera
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePicture() {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    setPhoto(result.uri);
    navigation.navigate('Preview', { photoUri: result.uri });
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
        <Text style={styles.captureButtonText}>Capture</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#2E5BBA',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 30,
  },
  captureButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionText: { textAlign: 'center', marginBottom: 16, fontSize: 16 },
  permissionButton: { backgroundColor: '#2E5BBA', padding: 12, borderRadius: 8 },
  permissionButtonText: { color: '#fff', fontWeight: 'bold' },
});
```

**Key notes**
- `useCameraPermissions()` checks + requests permission in one Hook.
- `useRef` (not `useState`) holds the `CameraView` reference — it needs a stable handle for `takePictureAsync()`, not a value that triggers re-renders.
- Native permission prompts are OS-owned on mobile (unlike the browser-owned prompt on web); a denial is more final — the user must go to system Settings to change it.

**Checkpoint**
- [ ] Opening the screen prompts for camera permission the first time
- [ ] After granting, a live camera feed fills the screen
- [ ] Tapping Capture doesn't crash (log `result.uri` to confirm)

---

## Phase 3 — Image Preview Screen

**Files:** `PreviewScreen.jsx`, navigation setup

1. Install navigation:
   ```bash
   npx expo install @react-navigation/native @react-navigation/native-stack
   npx expo install react-native-screens react-native-safe-area-context
   ```
2. Build `PreviewScreen.jsx`: reads `photoUri` from `route.params`, renders it full-screen with `Image` (`resizeMode="contain"`, black background), with two buttons below: **Retake** (`navigation.goBack()`) and **Analyze** (`navigation.navigate('Result', { photoUri })`).

```javascript
import { View, Image, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function PreviewScreen({ route, navigation }) {
  const { photoUri } = route.params;

  return (
    <View style={styles.container}>
      <Image source={{ uri: photoUri }} style={styles.preview} />
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.retakeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={() => navigation.navigate('Result', { photoUri })}
        >
          <Text style={styles.buttonText}>Analyze</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  preview: { flex: 1, resizeMode: 'contain' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 20 },
  retakeButton: { backgroundColor: '#5A6472', padding: 14, borderRadius: 8 },
  analyzeButton: { backgroundColor: '#5B3FA3', padding: 14, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
```

> Note: this `Analyze` handler is a stand-in. In Phase 4 it gets replaced to convert the photo to base64 before navigating (see 4.5).

**Checkpoint**
- [ ] Capturing a photo navigates to the preview screen
- [ ] The captured photo displays full-screen
- [ ] Retake returns to the live camera
- [ ] Analyze attempts to navigate to `'Result'` (ok if it errors — Result screen isn't built yet)

---

## Phase 4 — Gemini Vision Integration

**File:** `lib/gemini.js`

1. Install file system module:
   ```bash
   npx expo install expo-file-system
   ```
2. Build `lib/gemini.js` with two exports: `imageToBase64(uri)` and `analyzeImage(base64Image, prompt)`.

```javascript
import * as FileSystem from 'expo-file-system';

export async function imageToBase64(uri) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY;
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

export async function analyzeImage(base64Image, prompt) {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        },
      ],
    }),
  });

  const json = await response.json();
  return json;
}
```

3. Define the structured analysis prompt (also used in `ResultScreen.jsx`):

```javascript
const ANALYSIS_PROMPT = `
Analyze this image. Identify:
1. Objects - list the distinct physical objects you see
2. Context - briefly describe the setting or scene
3. Activities - what activity appears to be happening, if any
4. Recommendations - one practical suggestion based on the scene

Respond ONLY with valid JSON in this exact shape, no extra text:
{
  "objects": ["...", "..."],
  "context": "...",
  "activities": "...",
  "recommendations": "..."
}
`;
```

4. Update `PreviewScreen.jsx`'s Analyze handler to convert to base64 **before** navigating (keeps Result screen simple and avoids re-deriving from a raw file path):

```javascript
import { imageToBase64 } from '../lib/gemini';

async function handleAnalyze() {
  const base64Image = await imageToBase64(photoUri);
  navigation.navigate('Result', { base64Image });
}
```

**Gotchas to guard against**
- `inline_data.data` must be raw base64 — strip any `data:image/jpeg;base64,` prefix if present.
- Keep `quality: 0.7` in `takePictureAsync` to bound payload size.
- If `response.json()` throws, log `response.status` first — usually an HTML error page from a bad URL or invalid key.

**Checkpoint**
- [ ] Tapping Analyze converts to base64 without error (`console.log(base64Image.length)`)
- [ ] Navigating to Result passes `base64Image`, not `photoUri`

---

## Phase 4.5 — Object Detection with Roboflow (Optional)

**File:** `lib/roboflow.js`

Adds a second, complementary analysis: precise bounding boxes + confidence scores for a fixed object set (vs. Gemini's open-ended reasoning).

1. Create a free Roboflow account (roboflow.com) → Roboflow Universe → search "COCO" (safe default for everyday objects) → note `model_id/version` (e.g. `coco/8`) from the Model tab's sample request → copy the private API key from Settings → API Keys.
2. Add to `.env`:
   ```
   EXPO_PUBLIC_ROBOFLOW_KEY=your_roboflow_key_here
   ```
   Restart `npx expo start`.
3. Build `lib/roboflow.js`:

```javascript
const ROBOFLOW_MODEL_ID = 'coco';
const ROBOFLOW_MODEL_VERSION = '8';
const ROBOFLOW_API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_KEY;

export async function detectObjects(base64Image) {
  const url =
    `https://detect.roboflow.com/${ROBOFLOW_MODEL_ID}/` +
    `${ROBOFLOW_MODEL_VERSION}?api_key=${ROBOFLOW_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: base64Image,
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.predictions ?? [];
  } catch (err) {
    return [];
  }
}
```

4. In `ResultScreen.jsx`, call it alongside Gemini (inside the same try block, after the Gemini call succeeds), and render a "Detected Objects (Roboflow)" section:

```javascript
import { detectObjects } from '../lib/roboflow';

const [detections, setDetections] = useState([]);
// after Gemini succeeds:
const found = await detectObjects(base64Image);
setDetections(found);
```

```javascript
<Text style={styles.sectionTitle}>Detected Objects (Roboflow)</Text>
{detections.length === 0 ? (
  <Text style={styles.bodyText}>No objects detected above the confidence threshold.</Text>
) : (
  detections.map((d, i) => (
    <Text key={i} style={styles.listItem}>
      • {d.class} — {(d.confidence * 100).toFixed(1)}% confidence
    </Text>
  ))
)}
```

**Design notes**
- `detectObjects` always resolves to an array (never throws) — a failed detection degrades gracefully without crashing the whole screen.
- Model ID/version are plain constants, not secrets — no need for `.env`.
- Roboflow's endpoint takes the raw base64 string as the body (not JSON-wrapped, unlike Gemini).

**Checkpoint**
- [ ] A photo with recognizable objects returns a non-empty detection list
- [ ] An empty scene shows "No objects detected" without crashing
- [ ] Airplane Mode: Gemini analysis still shows even though Roboflow silently fails

**Push further:** draw bounding boxes with `react-native-svg` using each prediction's `x/y/width/height`; add a confidence threshold slider; cross-reference Roboflow vs. Gemini object lists.

---

## Phase 5 — AI Result Screen

**File:** `ResultScreen.jsx`

Design for three states — **loading**, **success**, **error** — skipping any one is the most common bug in API-driven screens.

```javascript
import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { analyzeImage } from '../lib/gemini';

const ANALYSIS_PROMPT = `...`; // from Phase 4

export default function ResultScreen({ route }) {
  const { base64Image } = route.params;
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runAnalysis();
  }, []);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeImage(base64Image, ANALYSIS_PROMPT);
      const textPart = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textPart) throw new Error('Empty response from Gemini');
      setAnalysis(JSON.parse(textPart));
    } catch (err) {
      setError('Could not analyze this image. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5B3FA3" />
        <Text style={styles.loadingText}>Analyzing image...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Objects</Text>
      {analysis.objects.map((obj, i) => (
        <Text key={i} style={styles.listItem}>• {obj}</Text>
      ))}
      <Text style={styles.sectionTitle}>Context</Text>
      <Text style={styles.bodyText}>{analysis.context}</Text>
      <Text style={styles.sectionTitle}>Activities</Text>
      <Text style={styles.bodyText}>{analysis.activities}</Text>
      <Text style={styles.sectionTitle}>Recommendations</Text>
      <Text style={styles.bodyText}>{analysis.recommendations}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#5A6472' },
  errorText: { color: '#B3261E', textAlign: 'center', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, color: '#1F2A44' },
  listItem: { fontSize: 15, marginTop: 4 },
  bodyText: { fontSize: 15, marginTop: 4, color: '#2B2F38' },
});
```

**Gotchas**
- If Gemini wraps the JSON in ` ```json ` fences, `JSON.parse()` throws — strip fences before parsing if encountered.
- Never call `analysis.objects.map(...)` before confirming `analysis` is non-null — the loading/error branches must return first.
- `try / catch / finally` is required so `setLoading(false)` always runs.

**Checkpoint**
- [ ] Spinner + "Analyzing image..." shows briefly before content
- [ ] Successful analysis shows all four real sections
- [ ] Airplane Mode shows the friendly error message, not a crash

---

## Phase 6 — Prompt Engineering

Refactor the single prompt into a named `PROMPTS` object with three personas, and let the user choose one before analysis runs. No changes needed to `gemini.js`, navigation logic, or Result JSX — only the prompt text and a persona picker.

**In a shared location (e.g. top of `PreviewScreen.jsx` or its own `lib/prompts.js`):**

```javascript
const PROMPTS = {
  academic: `Act as a university professor. Looking at this image, provide an academic-style analysis: identify the objects present, the educational context, and one piece of constructive feedback.`,
  safety: `Act as a workplace safety inspector. Looking at this image, identify any visible hazards, risks, or safety concerns. If none are visible, state that clearly.`,
  inventory: `Act as an asset management clerk. Looking at this image, list every visible physical asset as a clean inventory list, with no extra commentary.`,
};
```

**In `PreviewScreen.jsx`**, add a persona row and update the analyze handler:

```javascript
<View style={styles.personaRow}>
  <TouchableOpacity onPress={() => goAnalyze('academic')}>
    <Text style={styles.personaLabel}>Academic Analysis</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => goAnalyze('safety')}>
    <Text style={styles.personaLabel}>Safety Analysis</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => goAnalyze('inventory')}>
    <Text style={styles.personaLabel}>Inventory Analysis</Text>
  </TouchableOpacity>
</View>
```

```javascript
function goAnalyze(personaKey) {
  navigation.navigate('Result', { base64Image, promptKey: personaKey });
}
```

**In `ResultScreen.jsx`**, select the prompt by key before calling `analyzeImage`:

```javascript
const { base64Image, promptKey } = route.params;
const prompt = PROMPTS[promptKey];
const result = await analyzeImage(base64Image, prompt);
```

**Checkpoint**
- [ ] Same photo produces three visibly different analyses depending on persona
- [ ] No changes required to `gemini.js`, navigation, or result-rendering JSX — only prompt text

---

## Phase 7 — Platform & Screen Awareness

Make existing screens behave correctly across OS and device sizes — no new features.

1. **OS branching** with `Platform`:
   ```javascript
   import { Platform } from 'react-native';

   const cardShadow = Platform.select({
     ios: {
       shadowColor: '#000',
       shadowOpacity: 0.15,
       shadowOffset: { width: 0, height: 2 },
       shadowRadius: 4,
     },
     android: { elevation: 4 },
   });
   ```
   Apply OS-specific wording to the Phase 2 permission screen:
   ```javascript
   {Platform.OS === 'ios'
     ? 'TaskFlow needs camera access. Tap below, then choose "Allow" in the dialog.'
     : 'TaskFlow needs camera access. Tap below to grant the permission.'}
   ```

2. **Safe areas** — install and apply insets so the Capture button never collides with a home indicator / gesture bar:
   ```bash
   npx expo install react-native-safe-area-context
   ```
   ```javascript
   import { useSafeAreaInsets } from 'react-native-safe-area-context';

   const insets = useSafeAreaInsets();
   // ...
   <TouchableOpacity
     style={[styles.captureButton, { bottom: insets.bottom + 24 }]}
     onPress={takePicture}
   >
   ```
   Remove any fixed `bottom` value from the StyleSheet entry once switched to this pattern — the inline style always wins in a style array, so a stale fixed value invites confusion, not conflict, but should still be removed for clarity.

3. **Screen size** with `useWindowDimensions` (e.g. in `PreviewScreen.jsx`, cap image width on tablets):
   ```javascript
   import { useWindowDimensions } from 'react-native';

   const { width } = useWindowDimensions();
   const isTablet = width >= 768;
   // maxWidth: isTablet ? 600 : '100%'
   ```

**Rule of thumb:** `Platform.OS` → OS-specific behavior/styling. `useWindowDimensions` → size-specific layout. They answer different questions even though both affect layout.

**Checkpoint**
- [ ] Permission text differs between iOS and Android
- [ ] Capture button clears the home indicator / gesture bar
- [ ] Rotating/resizing changes layout without an app restart

---

## Phase 8 — Saving History with Supabase (Optional)

**Files:** `lib/supabase.js`, `HistoryScreen.jsx`

1. Create a free Supabase project (supabase.com). In the SQL Editor, run:
   ```sql
   create table analysis_history (
     id uuid primary key default gen_random_uuid(),
     created_at timestamptz default now(),
     objects text,
     context text,
     recommendations text
   );
   alter table analysis_history enable row level security;
   create policy "Allow anonymous read/write"
     on analysis_history
     for all
     using (true)
     with check (true);
   ```
   > ⚠️ This permissive policy is for following along only — before shipping, scope it to `auth.uid()` with Supabase Auth added.

2. Copy the Project URL and **Publishable key** (`sb_publishable_…`) from Settings → API Keys. Add to `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
   ```
3. Install dependencies and restart the dev server:
   ```bash
   npx expo install @supabase/supabase-js react-native-url-polyfill expo-sqlite
   ```
4. Build `lib/supabase.js` (polyfill imports **must** come first):
   ```javascript
   import 'react-native-url-polyfill/auto';
   import 'expo-sqlite/localStorage/install';
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
   const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

   export const supabase = createClient(supabaseUrl, supabasePublishableKey);
   ```
5. In `ResultScreen.jsx`, save each successful analysis after it's already rendered (failure to save must never block showing the result):
   ```javascript
   import { supabase } from '../lib/supabase';

   async function saveToHistory(result) {
     try {
       await supabase.from('analysis_history').insert({
         objects: result.objects.join(', '),
         context: result.context,
         recommendations: result.recommendations,
       });
     } catch (err) {
       console.warn('Failed to save history:', err);
     }
   }
   ```
6. Build `HistoryScreen.jsx`:
   ```javascript
   import { useState, useEffect } from 'react';
   import { View, FlatList, Text, ActivityIndicator } from 'react-native';
   import { supabase } from '../lib/supabase';

   export default function HistoryScreen() {
     const [rows, setRows] = useState([]);
     const [loading, setLoading] = useState(true);

     useEffect(() => {
       loadHistory();
     }, []);

     async function loadHistory() {
       const { data } = await supabase
         .from('analysis_history')
         .select()
         .order('created_at', { ascending: false });
       setRows(data ?? []);
       setLoading(false);
     }

     if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

     return (
       <FlatList
         data={rows}
         keyExtractor={(item) => item.id}
         renderItem={({ item }) => (
           <View style={{ padding: 12 }}>
             <Text style={{ fontWeight: 'bold' }}>{item.objects}</Text>
             <Text>{item.context}</Text>
           </View>
         )}
       />
     );
   }
   ```
7. Wire a button/icon on an existing screen to `navigation.navigate('History')`.

**Checkpoint**
- [ ] Running an analysis, then opening History, shows it as the newest entry
- [ ] Force-closing and reopening the app still shows saved history
- [ ] A broken Supabase URL/key still lets analysis complete and display — only the save silently fails

**Push further:** add Supabase Auth + scope RLS to `auth.uid()`; subscribe to Realtime for live history updates; store the photo in Supabase Storage and show thumbnails.

---

## Final Project Structure

```
/
├── .env                        # EXPO_PUBLIC_GEMINI_KEY, (optional) ROBOFLOW_KEY, SUPABASE_URL/KEY
├── .gitignore                  # must include .env
├── lib/
│   ├── gemini.js               # imageToBase64, analyzeImage
│   ├── roboflow.js             # (optional) detectObjects
│   └── supabase.js             # (optional) shared client
├── screens/ (or project root, per your navigator setup)
│   ├── CameraScreen.jsx
│   ├── PreviewScreen.jsx
│   ├── ResultScreen.jsx
│   └── HistoryScreen.jsx       # (optional)
└── App.jsx / navigation setup (native-stack: Camera → Preview → Result [→ History])
```

## Build Order Summary

1. Setup: install `expo-camera`, get Gemini key, configure `.env`
2. Camera screen: permission flow + live preview + capture
3. Preview screen: navigation + display captured photo
4. Gemini integration: base64 conversion + API call + prompt
5. *(Optional)* Roboflow object detection alongside Gemini
6. Result screen: loading / success / error states, parse + render JSON
7. Prompt engineering: swappable persona prompts
8. Platform awareness: `Platform.OS`, safe areas, `useWindowDimensions`
9. *(Optional)* Supabase: persist + list analysis history

## Key Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `EXPO_PUBLIC_GEMINI_KEY` | Yes | Gemini Vision API access |
| `EXPO_PUBLIC_ROBOFLOW_KEY` | Optional | Roboflow object detection |
| `EXPO_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional | Supabase client auth |

**Reminder:** never hardcode keys in component files; always route through `.env` with the `EXPO_PUBLIC_` prefix, and gitignore `.env` before the first commit.
