import React, { useState, useEffect } from "react";
import { View,Text, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AuthInput from "../components/AuthInput";
import { useAuth } from "../context/AuthContext";
import { getItem, setItem, removeItem } from "../services/storage";
import colors from "../constants/colors";

const MAX_ATTEMPTS = 3;
const LOCK_SECONDS = 272; // 4:32 como en el diseño
const LOCK_KEY = "@taqi:lock_until"; // hora (en milisegundos) en que termina el bloqueo

export default function LoginScreen({
  onGoToRegister,
  onLoginSuccess,
  onGoToForgotPassword,
}) {
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);

  const isLocked = lockSeconds > 0;

  // Al abrir la pantalla: si había un bloqueo vigente, se retoma con el tiempo que falta.
  // Así cerrar y abrir la app no reinicia ni borra el bloqueo.
  useEffect(() => {
    let activo = true;
    (async () => {
      const hasta = await getItem(LOCK_KEY, 0);
      const restante = Math.ceil((hasta - Date.now()) / 1000);
      if (activo && restante > 0) setLockSeconds(restante);
      else if (hasta) removeItem(LOCK_KEY);
    })();
    return () => {
      activo = false;
    };
  }, []);

  // Cuenta regresiva del bloqueo por intentos fallidos
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockSeconds > 0]);

  // El acceso con Google/Apple necesita un servicio externo de autenticación que aún no está integrado.
  const avisarProximamente = (proveedor) =>
    Alert.alert("Próximamente", `El acceso con ${proveedor} estará disponible pronto. Por ahora usa tu correo y contraseña.`);

  const formatTime = (total) => {
    const m = Math.floor(total / 60);
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const registerFailure = () => {
    const attempts = failedAttempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      setLockSeconds(LOCK_SECONDS);
      setItem(LOCK_KEY, Date.now() + LOCK_SECONDS * 1000);
      setFailedAttempts(0);
    } else {
      setFailedAttempts(attempts);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!identifier.trim()) newErrors.identifier = "Ingresa tu correo o usuario";
    if (!password) newErrors.password = "Ingresa tu contraseña";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (isLocked || loading) return;
    setLoginError(null);

    if (!validate()) {
      registerFailure();
      return;
    }

    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);

    if (!result.ok) {
      setLoginError(result.error);
      registerFailure();
      return;
    }
    setFailedAttempts(0);
    if (onLoginSuccess) onLoginSuccess(result.user);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
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

          {isLocked && (
            <View style={styles.lockBanner}>
              <Ionicons name="lock-closed" size={16} color={colors.coral} />
              <Text style={styles.lockText}>
                Demasiados intentos fallidos. Intenta de nuevo en {formatTime(lockSeconds)} minutos.
              </Text>
            </View>
          )}

          {!isLocked && loginError && (
            <View style={styles.lockBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.coral} />
              <Text style={styles.lockText}>{loginError}</Text>
            </View>
          )}

          <Text style={styles.label}>Correo o usuario</Text>
          <AuthInput
            icon="mail-outline"
            placeholder="camila.rojas@gmail.com"
            value={identifier}
            onChangeText={(t) => {
              setIdentifier(t);
              if (errors.identifier) setErrors((p) => ({ ...p, identifier: null }));
            }}
            keyboardType="email-address"
          />
          {errors.identifier && <Text style={styles.errorText}>{errors.identifier}</Text>}

          <Text style={styles.label}>Contraseña</Text>
          <AuthInput
            icon="lock-closed-outline"
            placeholder="••••••••"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              if (errors.password) setErrors((p) => ({ ...p, password: null }));
            }}
            secureTextEntry
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <TouchableOpacity
            style={styles.forgotWrapper}
            onPress={onGoToForgotPassword}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>¿Olvidé mi contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, (isLocked || loading) && styles.buttonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={isLocked || loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, isLocked && styles.buttonDisabled]}
            disabled={isLocked}
            onPress={() => avisarProximamente("Google")}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={18} color={colors.coral} />
            <Text style={styles.googleText}>Continuar con Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.appleButton, isLocked && styles.buttonDisabled]}
            disabled={isLocked}
            onPress={() => avisarProximamente("Apple")}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-apple" size={18} color={colors.white} />
            <Text style={styles.appleText}>Continuar con Apple</Text>
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
  flex: { flex: 1, backgroundColor: colors.darkBrown },
  scrollContent: { flexGrow: 1 },
  header: { alignItems: "center", paddingTop: 70, paddingBottom: 28 },
  logo: {
    width: 90,
    height: 79,
    marginBottom: 14,
    resizeMode: "contain",
    borderRadius: 12,
    overflow: "hidden",
  },
  brand: { fontSize: 26, fontWeight: "800", color: colors.cream, letterSpacing: 1 },
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
  cardTitle: { fontSize: 20, fontWeight: "800", color: colors.textDark, marginBottom: 16 },
  lockBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.coralLight,
    borderWidth: 1,
    borderColor: colors.coral,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  lockText: { flex: 1, marginLeft: 8, fontSize: 12, fontWeight: "600", color: colors.coral },
  label: { fontSize: 13, fontWeight: "600", color: colors.textDark, marginBottom: 8 },
  errorText: { fontSize: 12, color: colors.coral, marginTop: -10, marginBottom: 14 },
  forgotWrapper: { alignSelf: "flex-end", marginBottom: 20 },
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
  buttonDisabled: { opacity: 0.45 },
  loginButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 10, fontSize: 12, color: colors.textGrey },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    height: 48,
    borderRadius: 16,
    marginBottom: 10,
  },
  googleText: { marginLeft: 8, fontSize: 14, fontWeight: "700", color: colors.textDark },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
    height: 48,
    borderRadius: 16,
  },
  appleText: { marginLeft: 8, fontSize: 14, fontWeight: "700", color: colors.white },
  footer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: 28,
    paddingBottom: 40,
  },
  footerText: { fontSize: 14, color: colors.cream },
  footerLink: {
    fontSize: 14,
    color: colors.goldLight,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
