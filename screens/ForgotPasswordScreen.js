import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AuthInput from "../components/AuthInput";
import PasswordChecklist from "../components/PasswordChecklist";
import { isPasswordValid } from "../utils/passwordValidation";
import colors from "../constants/colors";

export default function ForgotPasswordScreen({ navigation }) {
  // Pasos: 1 = Enviar correo, 2 = Verificar código, 3 = Nueva contraseña, 4 = Éxito
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["2", "0", "9", "1"]);
  const [countdown, setCountdown] = useState(45);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (step === 2 && countdown > 0) {
      const timer = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
      return () => clearInterval(timer);
    }
  }, [step, countdown]);

  const handleSendCode = () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresa un correo electrónico válido");
      return;
    }
    setError(null);
    setStep(2);
    setCountdown(45);
  };

  const handleVerifyCode = () => {
    setError(null);
    setStep(3);
  };

  const handleResetPassword = () => {
    if (!isPasswordValid(newPassword)) {
      setError("La contraseña no cumple con los requisitos de seguridad");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError(null);
    Alert.alert(
      "¡Contraseña actualizada!",
      "Tu clave ha sido reestablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.",
      [{ text: "Ir a Iniciar Sesión", onPress: () => navigation.navigate("Login") }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Cabecera con botón atrás y logo */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
          >
            <Ionicons name="arrow-back" size={22} color={colors.cream} />
          </TouchableOpacity>
          <Image source={require("../assets/OsoLogo.png")} style={styles.logo} />
          <Text style={styles.brand}>TAQI</Text>
          <Text style={styles.tagline}>RECUPERACIÓN DE CUENTA</Text>
        </View>

        <View style={styles.card}>
          {/* PASO 1: Ingreso de correo */}
          {step === 1 && (
            <View>
              <Text style={styles.cardTitle}>Recuperar contraseña</Text>
              <Text style={styles.cardSubtitle}>
                Ingresa tu correo para enviarte un código de verificación de 4 dígitos.
              </Text>

              <Text style={styles.label}>Correo electrónico</Text>
              <AuthInput
                icon="mail-outline"
                placeholder="ejemplo@correo.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError(null);
                }}
                keyboardType="email-address"
              />
              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSendCode}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Enviar código</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PASO 2: Verificación de código */}
          {step === 2 && (
            <View>
              <Text style={styles.cardTitle}>Verificar código</Text>
              <Text style={styles.cardSubtitle}>
                Hemos enviado un código al correo {email}. Ingrésalo a continuación:
              </Text>

              <View style={styles.codeRow}>
                {code.map((digit, idx) => (
                  <View key={idx} style={styles.codeBox}>
                    <Text style={styles.codeDigit}>{digit}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.timerText}>
                Reenviar código en: 00:{String(countdown).padStart(2, "0")}
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleVerifyCode}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Verificar código</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* PASO 3: Nueva contraseña */}
          {step === 3 && (
            <View>
              <Text style={styles.cardTitle}>Nueva contraseña</Text>
              <Text style={styles.cardSubtitle}>
                ¡Código verificado! Ahora crea una contraseña segura para tu cuenta.
              </Text>

              <Text style={styles.label}>Nueva contraseña</Text>
              <AuthInput
                icon="lock-closed-outline"
                placeholder="••••••••"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              {newPassword.length > 0 && <PasswordChecklist password={newPassword} />}

              <Text style={styles.label}>Confirmar contraseña</Text>
              <AuthInput
                icon="lock-closed-outline"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleResetPassword}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Guardar contraseña</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.cancelLinkText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.darkBrown },
  scrollContent: { flexGrow: 1 },
  header: { alignItems: "center", paddingTop: 50, paddingBottom: 20 },
  backButton: { position: "absolute", top: 48, left: 20, padding: 8 },
  logo: { width: 70, height: 61, marginBottom: 8, resizeMode: "contain" },
  brand: { fontSize: 22, fontWeight: "800", color: colors.cream, letterSpacing: 1 },
  tagline: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.goldLight,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    flex: 1,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: colors.textDark, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: colors.textGrey, marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textDark, marginBottom: 8 },
  errorText: { fontSize: 12, color: colors.coral, marginTop: -8, marginBottom: 14 },
  primaryButton: {
    backgroundColor: colors.darkBrown,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  codeRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginVertical: 20 },
  codeBox: {
    width: 54,
    height: 58,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  codeDigit: { fontSize: 24, fontWeight: "800", color: colors.textDark },
  timerText: { textAlign: "center", fontSize: 13, color: colors.textGrey, marginBottom: 20 },
  cancelLink: { alignItems: "center", marginTop: 20, paddingVertical: 8 },
  cancelLinkText: { fontSize: 13, color: colors.darkBrown, fontWeight: "600", textDecorationLine: "underline" },
});
