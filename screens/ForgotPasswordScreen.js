import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AuthInput from "../components/AuthInput";
import PasswordChecklist from "../components/PasswordChecklist";
import { isPasswordValid } from "../utils/passwordValidation";
import { confirmarReset, solicitarCodigoReset, verificarCodigoReset } from "../services/authService";
import colors from "../constants/colors";

// Longitud del código de verificación (igual que en el diseño de Figma)
const CODIGO_LARGO = 6;

export default function ForgotPasswordScreen({ navigation }) {
  // Pasos: 1 = Enviar correo, 2 = Verificar código, 3 = Nueva contraseña, 4 = Éxito
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [codigoDemo, setCodigoDemo] = useState(null); // el servidor solo lo devuelve en modo demostración
  const [permiso, setPermiso] = useState(""); // lo entrega el servidor cuando el código es correcto
  const [cargando, setCargando] = useState(false);
  const [codigoIngresado, setCodigoIngresado] = useState("");
  const codigoInputRef = useRef(null);
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

  // El código lo genera y lo verifica el SERVIDOR (vale 10 minutos y permite 5 intentos).
  // Devuelve true si el servidor lo generó. Se usa al pedirlo por primera vez y al reenviarlo.
  const pedirCodigo = async () => {
    setCargando(true);
    const r = await solicitarCodigoReset(email.trim());
    setCargando(false);
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    setCodigoDemo(r.codigoDemo);
    setCodigoIngresado("");
    setCountdown(45);
    return true;
  };

  const handleSendCode = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresa un correo electrónico válido");
      return;
    }
    setError(null);
    if (await pedirCodigo()) setStep(2);
  };

  const handleResend = async () => {
    setError(null);
    await pedirCodigo();
  };

  const handleVerifyCode = async () => {
    if (codigoIngresado.length !== CODIGO_LARGO) {
      setError("Ingresa los 6 dígitos del código");
      return;
    }
    setCargando(true);
    const r = await verificarCodigoReset(email.trim(), codigoIngresado);
    setCargando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setPermiso(r.permiso);
    setError(null);
    setStep(3);
  };

  const handleResetPassword = async () => {
    if (!isPasswordValid(newPassword)) {
      setError("La contraseña no cumple con los requisitos de seguridad");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError(null);
    setCargando(true);
    const result = await confirmarReset(permiso, newPassword);
    setCargando(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
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
                Ingresa tu correo para enviarte un código de verificación de 6 dígitos.
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
                style={[styles.primaryButton, cargando && styles.buttonBusy]}
                onPress={handleSendCode}
                disabled={cargando}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>{cargando ? "Enviando..." : "Enviar código"}</Text>
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

              {/* Seis casillas: se ve cada dígito, pero se escribe en un solo campo invisible */}
              <TouchableOpacity activeOpacity={1} onPress={() => codigoInputRef.current?.focus()}>
                <View style={styles.codeRow}>
                  {Array.from({ length: CODIGO_LARGO }).map((_, idx) => (
                    <View
                      key={idx}
                      style={[styles.codeBox, idx === codigoIngresado.length && styles.codeBoxActive]}
                    >
                      <Text style={styles.codeDigit}>{codigoIngresado[idx] ?? ""}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
              <TextInput
                ref={codigoInputRef}
                value={codigoIngresado}
                onChangeText={(t) => {
                  setCodigoIngresado(t.replace(/[^0-9]/g, "").slice(0, CODIGO_LARGO));
                  if (error) setError(null);
                }}
                keyboardType="number-pad"
                maxLength={CODIGO_LARGO}
                autoFocus
                style={styles.codeHiddenInput}
              />
              <Text style={styles.demoNote}>
                {codigoDemo
                  ? `Modo demostración (sin servicio de correo): tu código es ${codigoDemo}`
                  : "Sin servicio de correo: quien administra el servidor ve el código en su consola."}
              </Text>

              {error && (
                <View style={styles.codeErrorRow}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.coral} />
                  <Text style={styles.codeErrorText}>{error}</Text>
                </View>
              )}

              {countdown > 0 && (
                <Text style={styles.timerCount}>00:{String(countdown).padStart(2, "0")}</Text>
              )}
              <View style={styles.resendRow}>
                <Text style={styles.timerText}>¿No recibiste el código? </Text>
                <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || cargando}>
                  <Text style={[styles.resendLink, countdown > 0 && styles.resendLinkOff]}>Reenviar código</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, cargando && styles.buttonBusy]}
                onPress={handleVerifyCode}
                disabled={cargando}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>{cargando ? "Verificando..." : "Verificar"}</Text>
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
                style={[styles.primaryButton, cargando && styles.buttonBusy]}
                onPress={handleResetPassword}
                disabled={cargando}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>{cargando ? "Guardando..." : "Guardar contraseña"}</Text>
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
  buttonBusy: { opacity: 0.6 },
  codeRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginVertical: 20 },
  codeBox: {
    width: 46,
    height: 54,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxActive: { borderColor: colors.gold },
  codeHiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  codeErrorRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 12 },
  codeErrorText: { fontSize: 13, color: colors.coral, fontWeight: "600" },
  timerCount: { textAlign: "center", fontSize: 18, fontWeight: "800", color: colors.textDark, marginBottom: 4 },
  resendRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  resendLink: { fontSize: 13, color: colors.textDark, fontWeight: "700", textDecorationLine: "underline" },
  resendLinkOff: { color: colors.textGrey, textDecorationLine: "none" },
  demoNote: { fontSize: 11, color: colors.textGrey, textAlign: "center", marginBottom: 14 },
  codeDigit: { fontSize: 24, fontWeight: "800", color: colors.textDark },
  timerText: { fontSize: 13, color: colors.textGrey },
  cancelLink: { alignItems: "center", marginTop: 20, paddingVertical: 8 },
  cancelLinkText: { fontSize: 13, color: colors.darkBrown, fontWeight: "600", textDecorationLine: "underline" },
});
