import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./context/AuthContext";
import { AppDataProvider } from "./context/AppDataContext";
import { BloqueoProvider } from "./context/BloqueoContext";
import BloqueoOverlay from "./components/BloqueoOverlay";
import AppNavigator from "./navigation/AppNavigator";
import { navigationRef } from "./navigation/rootNavigation";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <BloqueoProvider>
            <AppDataProvider>
              <View style={{ flex: 1 }}>
                <NavigationContainer ref={navigationRef}>
                  <AppNavigator />
                </NavigationContainer>
                <BloqueoOverlay />
              </View>
            </AppDataProvider>
          </BloqueoProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
