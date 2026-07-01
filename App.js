import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import CameraScreen from './screens/CameraScreen';
import PreviewScreen from './screens/PreviewScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Camera"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#11131e',
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen} 
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Preview" 
            component={PreviewScreen} 
            options={{ 
              title: 'Review Image',
              headerStyle: { backgroundColor: '#090a0f' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen 
            name="Result" 
            component={ResultScreen} 
            options={{ 
              title: 'Analysis',
              headerStyle: { backgroundColor: '#090a0f' },
              headerTintColor: '#ffffff',
            }}
          />
          <Stack.Screen 
            name="History" 
            component={HistoryScreen} 
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
