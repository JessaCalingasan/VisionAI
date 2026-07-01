import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [isCapturing, setIsCapturing] = useState(false);

  if (!permission) {
    // Still loading permission state
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.titleText}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            {Platform.OS === 'ios'
              ? 'VisionAI needs camera access to analyze your surroundings. Tap below, then choose "Allow" in the dialog.'
              : 'VisionAI needs camera access to analyze your surroundings. Tap below to grant the permission.'}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  async function takePicture() {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: false,
      });
      setIsCapturing(false);
      navigation.navigate('Preview', { photoUri: result.uri });
    } catch (error) {
      console.error('Failed to take picture:', error);
      setIsCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      
      {/* Top Header Overlay */}
      <View style={[styles.headerOverlay, { paddingTop: Math.max(insets.top, 20) }]}>
        <Text style={styles.headerTitle}>VisionAI</Text>
        <TouchableOpacity 
          style={styles.historyShortcut} 
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.historyShortcutText}>History 📜</Text>
        </TouchableOpacity>
      </View>

      {/* Capture Button Area */}
      <View style={[styles.controlsContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity 
          style={styles.captureOuterRing} 
          onPress={takePicture}
          disabled={isCapturing}
          activeOpacity={0.8}
        >
          <View style={[
            styles.captureInnerCircle, 
            isCapturing && styles.captureInnerCircleActive
          ]} />
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(9, 10, 15, 0.4)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  historyShortcut: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyShortcutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9, 10, 15, 0.3)',
    paddingVertical: 20,
  },
  captureOuterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  captureInnerCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#ffffff',
  },
  captureInnerCircleActive: {
    backgroundColor: '#ff4b4b',
    transform: [{ scale: 0.9 }],
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#090a0f',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionCard: {
    backgroundColor: '#151724',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    color: '#a0aec0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
