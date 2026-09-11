import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View, StyleSheet } from "react-native";
import SplashScreen from "./screens/SplashScreen";
import LoadingScreen from "./screens/LoadingScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import HomeScreen from "./screens/HomeScreen";
import ActivityScreen from "./screens/ActivityScreen";
import MetasScreen from "./screens/MetasScreen";
import WalletScreen from "./screens/WalletScreen";
import ProfileScreen from "./screens/ProfileScreen";
import colors from "./constants/colors";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState("splash");
  const [activeTab, setActiveTab] = useState("principal");
  const [userName, setUserName] = useState("Camila");
  const [userEmail, setUserEmail] = useState("camila@gmail.com");

  const handleLoginSuccess = ({ email }) => {
    setUserName(email ? email.split("@")[0] : "Camila");
    setUserEmail(email || "camila@gmail.com");
    setCurrentScreen("app");
    setActiveTab("principal");
  };

  const handleRegisterSuccess = ({ username, email }) => {
    setUserName(username);
    setUserEmail(email || "");
    setCurrentScreen("app");
    setActiveTab("principal");
  };

  const handleLogout = () => {
    setCurrentScreen("login");
  };

  const tabProps = { activeTab, onTabPress: setActiveTab };

  const renderTabScreen = () => {
    switch (activeTab) {
      case "actividad":
        return <ActivityScreen {...tabProps} />;
      case "metas":
        return <MetasScreen {...tabProps} />;
      case "bolsa":
        return <WalletScreen {...tabProps} />;
      case "perfil":
        return <ProfileScreen {...tabProps} userName={userName} userEmail={userEmail} onLogout={handleLogout} />;
      default:
        return <HomeScreen {...tabProps} userName={userName} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style={currentScreen === "app" ? "dark" : "light"} />
      {currentScreen === "splash" && (
        <SplashScreen onFinish={() => setCurrentScreen("loading")} />
      )}
      {currentScreen === "loading" && (
        <LoadingScreen onFinish={() => setCurrentScreen("login")} />
      )}
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
      {currentScreen === "app" && renderTabScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBrown,
  },
});