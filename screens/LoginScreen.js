import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import AuthInput from "../components/AuthInput";
import colors from "../constants/colors";

export default function LoginScreen({ onGoToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (onLoginSuccess) onLoginSuccess({ email });
    }, 900);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Image source={require("../assets/OsoLogo.png")} style={styles.logo} />
          <Text style={styles.brand}>TAQI</Text>
          <Text style={styles.tagline}>TU OSO DE CONFIANZA</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ingresa a tu cuenta</Text>

          <Text style={styles.label}>Correo o celular</Text>
          <AuthInput
            icon="mail-outline"
            placeholder="camila.rojas@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <Text style={styles.label}>Contraseña</Text>
          <AuthInput
            icon="mail-outline"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.forgotWrapper}>
            <Text style={styles.forgotText}>¿Olvidé mi contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={onGoToRegister}>
            <Text style={styles.footerLink}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.darkBrown,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    paddingTop: 70,
    paddingBottom: 28,
  },
  logo: {
    width: 90,
    height: 79,
    marginBottom: 14,
    resizeMode: "contain",
    borderRadius: 150,
    overflow: "hidden",
  },
  brand: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.cream,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.goldLight,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textDark,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textDark,
    marginBottom: 8,
  },
  forgotWrapper: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.coral,
    textDecorationLine: "underline",
  },
  loginButton: {
    backgroundColor: colors.darkBrown,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: 28,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: colors.cream,
  },
  footerLink: {
    fontSize: 14,
    color: colors.goldLight,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});