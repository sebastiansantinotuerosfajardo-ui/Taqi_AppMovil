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
import PasswordChecklist from "../components/PasswordChecklist";
import { isPasswordValid } from "../utils/passwordValidation";
import colors from "../constants/colors";

export default function RegisterScreen({ onGoToLogin, onRegisterSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = isPasswordValid(password);
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password;
  const usernameValid = username.trim().length >= 3;

  const canSubmit = emailValid && passwordValid && passwordsMatch && usernameValid;

  const handleRegister = () => {
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (onRegisterSuccess) onRegisterSuccess({ email, username });
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
          <Text style={styles.cardTitle}>Crea tu cuenta</Text>
          <Text style={styles.cardSubtitle}>Únete a la familia Taqi hoy</Text>

          <Text style={styles.label}>Correo electrónico</Text>
          <AuthInput
            icon="mail-outline"
            placeholder="ejemplo@correo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />

          <Text style={styles.label}>Contraseña</Text>
          <AuthInput
            icon="lock-closed-outline"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {password.length > 0 && <PasswordChecklist password={password} />}

          <Text style={styles.label}>Confirmar contraseña</Text>
          <AuthInput
            icon="lock-closed-outline"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <Text style={styles.errorText}>Las contraseñas no coinciden</Text>
          )}

          <Text style={styles.label}>Nombre de usuario</Text>
          <AuthInput
            icon="person-outline"
            placeholder="camila.rojas"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.registerButton, !canSubmit && styles.registerButtonDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={!canSubmit || loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={onGoToLogin}>
            <Text style={styles.footerLink}>Inicia sesión</Text>
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
    paddingTop: 50,
    paddingBottom: 20,
  },
  logo: {
    width: 70,
    height: 61,
    marginBottom: 10,
    resizeMode: "contain",
    borderRadius: 12,
    overflow: "hidden",
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.cream,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 10,
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
    paddingTop: 24,
    paddingBottom: 32,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textDark,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textGrey,
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textDark,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.coral,
    marginTop: -10,
    marginBottom: 14,
  },
  registerButton: {
    backgroundColor: colors.darkBrown,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  registerButtonDisabled: {
    backgroundColor: colors.textGrey,
  },
  registerButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: 24,
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