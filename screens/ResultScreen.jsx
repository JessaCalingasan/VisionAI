import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyzeImage } from '../lib/gemini';
import { detectObjects } from '../lib/roboflow';
import { supabase } from '../lib/supabase';

const PROMPTS = {
  academic: `Analyze this image as a university professor.
Identify:
1. Objects - list the distinct physical objects of educational or functional interest
2. Context - describe the educational or intellectual setting
3. Activities - what learning or academic activity appears to be happening
4. Recommendations - one constructive educational feedback or suggestion

Respond ONLY with valid JSON in this exact shape, no markdown formatting (no \`\`\`json blocks), no extra text:
{
  "objects": ["...", "..."],
  "context": "...",
  "activities": "...",
  "recommendations": "..."
}`,
  safety: `Analyze this image as a workplace safety inspector.
Identify:
1. Objects - list the physical objects that could pose risks or represent safety equipment
2. Context - describe the safety setting or environment
3. Activities - what safety hazards, risks, or safe practices are happening
4. Recommendations - one practical workplace safety recommendation

Respond ONLY with valid JSON in this exact shape, no markdown formatting (no \`\`\`json blocks), no extra text:
{
  "objects": ["...", "..."],
  "context": "...",
  "activities": "...",
  "recommendations": "..."
}`,
  inventory: `Analyze this image as an asset management clerk.
Identify:
1. Objects - list every visible physical asset
2. Context - describe the storage or environment location
3. Activities - what state of management or utilization the assets are in
4. Recommendations - one inventory organization suggestion

Respond ONLY with valid JSON in this exact shape, no markdown formatting (no \`\`\`json blocks), no extra text:
{
  "objects": ["...", "..."],
  "context": "...",
  "activities": "...",
  "recommendations": "..."
}`
};

export default function ResultScreen({ route, navigation }) {
  const { base64Image, promptKey } = route.params;
  const insets = useSafeAreaInsets();
  const [analysis, setAnalysis] = useState(null);
  const [detections, setDetections] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runAnalysis();
  }, []);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const selectedPrompt = PROMPTS[promptKey] || PROMPTS.academic;
      const result = await analyzeImage(base64Image, selectedPrompt);
      const textPart = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textPart) {
        throw new Error('Empty response from Gemini');
      }

      // Strip markdown code fences (```json ... ```) if Gemini includes them
      let cleanedText = textPart.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.substring(7);
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.substring(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.substring(0, cleanedText.length - 3);
      }
      cleanedText = cleanedText.trim();

      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('JSON parse error on text:', cleanedText, parseError);
        throw new Error('Response could not be parsed as structured JSON.');
      }

      setAnalysis(parsedAnalysis);

      // Perform object detection in parallel
      try {
        const found = await detectObjects(base64Image);
        setDetections(found);
      } catch (roboflowError) {
        console.warn('Roboflow execution failed:', roboflowError);
      }

      // Save to Supabase history asynchronously without blocking UI render
      saveToHistory(parsedAnalysis);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not analyze this image. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function saveToHistory(result) {
    try {
      await supabase.from('analysis_history').insert({
        objects: result.objects.join(', '),
        context: result.context,
        recommendations: result.recommendations,
      });
    } catch (err) {
      console.warn('Failed to save history in Supabase:', err);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Analyzing visual content...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { padding: 24 }]}>
        <View style={styles.errorCard}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Analysis Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={runAnalysis}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.popToTop()}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const cardShadow = Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
    },
    android: { elevation: 4 },
  });

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContainer, 
          { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 40) }
        ]}
      >
        <Text style={styles.screenTitle}>AI Analysis Results</Text>
        <Text style={styles.subtitleText}>Persona: {promptKey.toUpperCase()}</Text>

        {/* Section: Objects */}
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.sectionTitle}>🔍 Identified Objects</Text>
          <View style={styles.listContainer}>
            {analysis.objects && analysis.objects.map((obj, i) => (
              <Text key={i} style={styles.listItem}>• {obj}</Text>
            ))}
          </View>
        </View>

        {/* Section: Roboflow Object Detection (if data exists) */}
        {detections.length > 0 && (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.sectionTitle}>🎯 Roboflow Detection</Text>
            <View style={styles.listContainer}>
              {detections.map((d, i) => (
                <Text key={i} style={styles.listItem}>
                  • {d.class} — {(d.confidence * 100).toFixed(1)}% confidence
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Section: Context */}
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.sectionTitle}>🗺️ Context & Setting</Text>
          <Text style={styles.bodyText}>{analysis.context}</Text>
        </View>

        {/* Section: Activities */}
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.sectionTitle}>🏃 Activities & Scene</Text>
          <Text style={styles.bodyText}>{analysis.activities}</Text>
        </View>

        {/* Section: Recommendations */}
        <View style={[styles.card, cardShadow, styles.recommendationCard]}>
          <Text style={styles.sectionTitleDark}>💡 Recommendation</Text>
          <Text style={styles.bodyTextDark}>{analysis.recommendations}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.doneButton} 
            onPress={() => navigation.popToTop()}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.historyButton} 
            onPress={() => navigation.navigate('History')}
          >
            <Text style={styles.historyButtonText}>View History Log</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090a0f',
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#a0aec0',
    fontSize: 16,
    fontWeight: '500',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
    letterSpacing: 1.5,
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#11131e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  recommendationCard: {
    backgroundColor: '#818cf8',
    borderColor: '#a5b4fc',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  sectionTitleDark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#090a0f',
    marginBottom: 10,
  },
  listContainer: {
    paddingLeft: 4,
  },
  listItem: {
    fontSize: 15,
    color: '#cbd5e1',
    marginBottom: 6,
    lineHeight: 20,
  },
  bodyText: {
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
  },
  bodyTextDark: {
    fontSize: 15,
    color: '#090a0f',
    lineHeight: 22,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: '#1b1318',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 15,
    color: '#fca5a5',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#a0aec0',
    fontWeight: '600',
    fontSize: 16,
  },
  actionContainer: {
    marginTop: 12,
    gap: 12,
  },
  doneButton: {
    backgroundColor: '#6366f1',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  historyButton: {
    backgroundColor: '#1b1d2e',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyButtonText: {
    color: '#a0aec0',
    fontWeight: '600',
    fontSize: 16,
  },
});
