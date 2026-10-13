import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./context/AuthContext";
import AppNavigator from "./navigation/AppNavigator";
import { navigationRef } from "./navigation/rootNavigation";

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
