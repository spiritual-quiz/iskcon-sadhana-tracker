import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

const appNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFF9F0',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={appNavTheme}>
        <AuthProvider>
          <StatusBar style="dark" backgroundColor="#FFA600" translucent={false} />
          <RootNavigator />
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
