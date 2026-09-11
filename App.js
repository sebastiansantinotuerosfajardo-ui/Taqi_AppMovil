import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import colors from "./constants/colors";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("login");
  const [userName, setUserName] = useState("Camila");

  const handleLoginSuccess = ({ email }) => {
    setUserName(email ? email.split("@")[0] : "Camila");
    setCurrentScreen("home");
  };

  const handleRegisterSuccess = ({ username }) => {
    setUserName(username);
    setCurrentScreen("home");
  };

  return (
    <View style={styles.container}>
      <StatusBar style={currentScreen === "home" ? "dark" : "light"} />
      {currentScreen === "login" && (
        <LoginScreen
          onGoToRegister={() => setCurrentScreen("register")}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {currentScreen === "register" && (
        <RegisterScreen
          onGoToLogin={() => setCurrentScreen("login")}
          onRegisterSuccess={handleRegisterSuccess}
        />
      )}
      {currentScreen === "home" && <HomeScreen userName={userName} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBrown,
  },
});