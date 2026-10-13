import React, { useCallback } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import BottomTabBar from "../components/BottomTabBar";
import SplashScreen from "../screens/SplashScreen";
import LoadingScreen from "../screens/LoadingScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import ActivityScreen from "../screens/ActivityScreen";
import MetasScreen from "../screens/MetasScreen";
import WalletScreen from "../screens/WalletScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Navegación por pestañas (usa nuestra barra personalizada)
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="principal"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <BottomTabBar
          activeTab={props.state.routes[props.state.index].name}
          onTabPress={(key) => props.navigation.navigate(key)}
        />
      )}
    >
      <Tab.Screen name="actividad" component={ActivityScreen} />
      <Tab.Screen name="metas" component={MetasScreen} />
      <Tab.Screen name="principal" component={HomeScreen} />
      <Tab.Screen name="bolsa" component={WalletScreen} />
      <Tab.Screen name="perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function SplashRoute({ navigation }) {
  const handleFinish = useCallback(() => navigation.replace("Loading"), [navigation]);
  return <SplashScreen onFinish={handleFinish} />;
}

function LoadingRoute({ navigation }) {
  const handleFinish = useCallback(() => navigation.replace("Login"), [navigation]);
  return <LoadingScreen onFinish={handleFinish} />;
}

function LoginRoute({ navigation }) {
  return (
    <LoginScreen
      onGoToRegister={() => navigation.navigate("Register")}
      onLoginSuccess={() => navigation.replace("Main")}
    />
  );
}

function RegisterRoute({ navigation }) {
  return (
    <RegisterScreen
      onGoToLogin={() => navigation.navigate("Login")}
      onRegisterSuccess={() => navigation.replace("Main")}
    />
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{ headerShown: false, animation: "fade" }}
    >
      <Stack.Screen name="Splash" component={SplashRoute} />
      <Stack.Screen name="Loading" component={LoadingRoute} />
      <Stack.Screen name="Login" component={LoginRoute} />
      <Stack.Screen name="Register" component={RegisterRoute} />
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}