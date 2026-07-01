import { File } from 'expo-file-system';

export async function imageToBase64(uri) {
  try {
    const file = new File(uri);
    return await file.base64();
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY;
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

export async function analyzeImage(base64Image, prompt) {
  if (!GEMINI_KEY || GEMINI_KEY === 'your_gemini_key_here') {
    throw new Error('Gemini API key is not configured. Please add your real key in the .env file at the project root.');
  }

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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API Response Error:', response.status, errorText);
    throw new Error(`Gemini API returned error code ${response.status}`);
  }

  const json = await response.json();
  return json;
}
