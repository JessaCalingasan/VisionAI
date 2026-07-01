import { useState } from 'react';
import { View, Image, TouchableOpacity, Text, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { imageToBase64 } from '../lib/gemini';

export default function PreviewScreen({ route, navigation }) {
  const { photoUri } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedPersona, setSelectedPersona] = useState('academic');
  const [isProcessing, setIsProcessing] = useState(false);

  const isTablet = width >= 768;

  async function handleAnalyze() {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      const base64Image = await imageToBase64(photoUri);
      setIsProcessing(false);
      navigation.navigate('Result', { 
        base64Image, 
        promptKey: selectedPersona 
      });
    } catch (error) {
      console.error('Error during image conversion:', error);
      setIsProcessing(false);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: photoUri }} 
          style={[
            styles.previewImage, 
            isTablet && { maxWidth: 600, alignSelf: 'center' }
          ]} 
        />
      </View>

      {/* Persona Selection Header */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorTitle}>Select Analysis Persona</Text>
        <View style={styles.personaRow}>
          <TouchableOpacity 
            style={[
              styles.personaButton, 
              selectedPersona === 'academic' && styles.personaButtonActive
            ]}
            onPress={() => setSelectedPersona('academic')}
          >
            <Text style={[
              styles.personaText, 
              selectedPersona === 'academic' && styles.personaTextActive
            ]}>🎓 Academic</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.personaButton, 
              selectedPersona === 'safety' && styles.personaButtonActive
            ]}
            onPress={() => setSelectedPersona('safety')}
          >
            <Text style={[
              styles.personaText, 
              selectedPersona === 'safety' && styles.personaTextActive
            ]}>⚠️ Safety</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.personaButton, 
              selectedPersona === 'inventory' && styles.personaButtonActive
            ]}
            onPress={() => setSelectedPersona('inventory')}
          >
            <Text style={[
              styles.personaText, 
              selectedPersona === 'inventory' && styles.personaTextActive
            ]}>📋 Inventory</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Primary Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.retakeButton]} 
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Text style={styles.retakeButtonText}>Retake</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.analyzeButton]} 
          onPress={handleAnalyze}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze Photo</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090a0f',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#020204',
    justifyContent: 'center',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  selectorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#11131e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  personaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  personaButton: {
    flex: 1,
    backgroundColor: '#1b1d2e',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  personaButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#818cf8',
  },
  personaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a0aec0',
  },
  personaTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#11131e',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#2d3748',
  },
  retakeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  analyzeButton: {
    backgroundColor: '#6366f1',
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
