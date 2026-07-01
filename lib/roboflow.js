const ROBOFLOW_MODEL_ID = 'coco';
const ROBOFLOW_MODEL_VERSION = '8';
const ROBOFLOW_API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_KEY;

export async function detectObjects(base64Image) {
  if (!ROBOFLOW_API_KEY || ROBOFLOW_API_KEY === 'your_roboflow_key_here') {
    console.warn('Roboflow API key not configured or set to placeholder. Skipping object detection.');
    return [];
  }

  const url =
    `https://detect.roboflow.com/${ROBOFLOW_MODEL_ID}/` +
    `${ROBOFLOW_MODEL_VERSION}?api_key=${ROBOFLOW_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: base64Image,
    });
    if (!response.ok) {
      console.warn('Roboflow API returned status:', response.status);
      return [];
    }
    const data = await response.json();
    return data.predictions ?? [];
  } catch (err) {
    console.warn('Roboflow detection failed:', err);
    return [];
  }
}
