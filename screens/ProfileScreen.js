import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useAppData } from "../context/AppDataContext";
import { resetTo } from "../navigation/rootNavigation";
import { soportado, pedirPermiso, pedirAlarmaExacta, probarEn5s } from "../services/notifications";
import AvisosCard from "../components/AvisosCard";
import { tomarFoto } from "../services/camera";
import { logger } from "../services/logger";
import colors from "../constants/colors";

export default function ProfileScreen() {
  const { user, logout, updateAvatar } = useAuth();
  const { perfilVivienda, setPerfilVivienda, ajustes, setRecordatorios } = useAppData();

  const username = user ? user.username : "Usuario";
  const email = user ? user.email : "";
  const initials = username.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
    resetTo("Login");
  };

  const togglePerfilVivienda = () => {
    const nuevoPerfil = perfilVivienda === "fija" ? "variable" : "fija";
    setPerfilVivienda(nuevoPerfil);
  };

  const badgeText = perfilVivienda === "variable" ? "Variable" : "Fija";

  // Si el usuario negó el permiso, se le explica qué hacer. Si ya no se le puede volver a preguntar,
  // se ofrece abrir los ajustes del teléfono.
  const avisarSinPermiso = (permiso) => {
    if (permiso.canAskAgain) {
      Alert.alert(
        "Permiso de notificaciones",
        "Sin este permiso TAQI no puede enviarte recordatorios."
      );
      return;
    }
    Alert.alert(
      "Notificaciones bloqueadas",
      "Actívalas desde los ajustes del teléfono para recibir recordatorios.",
      [
        { text: "Ahora no", style: "cancel" },
        { text: "Abrir ajustes", onPress: () => Linking.openSettings() },
      ]
    );
  };

  // Estas secciones existen en el diseño pero aún no tienen pantalla propia.
  const avisarProximamente = () =>
    Alert.alert("Próximamente", "Esta sección estará disponible en una próxima versión.");

  const handleToggleRecordatorios = async (activar) => {
    if (!activar) {
      setRecordatorios(false);
      return;
    }
    const permiso = await pedirPermiso();
    if (permiso.granted) {
      setRecordatorios(true);
      // Android 12+: sin el permiso de alarmas exactas los avisos pueden demorar. En Expo Go se omite sin error.
      if (ajustes.avisoPuntual) await pedirAlarmaExacta();
    } else {
      avisarSinPermiso(permiso);
    }
  };

  const handleProbarNotificacion = async () => {
    try {
      const permiso = await pedirPermiso();
      if (!permiso.granted) {
        avisarSinPermiso(permiso);
        return;
      }
      await probarEn5s();
      Alert.alert("Notificación programada", "Llegará en 5 segundos. Puedes minimizar la app para verla.");
    } catch (error) {
      logger.error("perfil", "No se pudo programar la notificación de prueba", error);
      Alert.alert("Error", "No se pudo programar la notificación. Inténtalo de nuevo.");
    }
  };

  const handleCambiarAvatar = async () => {
    const opciones = [
      {
        text: "Tomar foto con la cámara",
        onPress: async () => {
          const resultado = await tomarFoto({ aspect: [1, 1], quality: 0.5 });
          if (resultado.ok) {
            await updateAvatar(resultado.uri);
          } else if (resultado.motivo === "permiso") {
            Alert.alert(
              "Permiso de cámara",
              "Activa el permiso de cámara en los ajustes del teléfono para actualizar tu foto de perfil.",
              [
                { text: "Ahora no", style: "cancel" },
                { text: "Abrir ajustes", onPress: () => Linking.openSettings() },
              ]
            );
          } else if (resultado.motivo === "error") {
            Alert.alert("Error", "No se pudo abrir la cámara. Inténtalo de nuevo.");
          }
        },
      },
    ];

    if (user?.avatar) {
      opciones.push({
        text: "Quitar foto",
        style: "destructive",
        onPress: async () => {
          await updateAvatar(null);
        },
      });
    }

    opciones.push({ text: "Cancelar", style: "cancel" });

    Alert.alert(
      "Foto de perfil",
      "Personaliza tu imagen en TAQI con la cámara del dispositivo:",
      opciones
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarBlock}>
          <TouchableOpacity
            style={styles.avatarTouchable}
            onPress={handleCambiarAvatar}
            activeOpacity={0.8}
          >
            <View style={styles.avatarCircle}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCambiarAvatar} activeOpacity={0.7}>
            <Text style={styles.changePhotoText}>Cambiar foto de perfil</Text>
          </TouchableOpacity>
          <Text style={styles.name}>{username}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowBorder]}
            onPress={togglePerfilVivienda}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={18} color={colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Perfil de vivienda</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
          </TouchableOpacity>

          <View style={[styles.menuRow, styles.menuRowBorder]}>
            <Ionicons name="notifications-outline" size={18} color={colors.textDark} style={styles.menuIcon} />
            <View style={styles.menuTextBlock}>
              <Text style={styles.menuLabel}>Notificaciones</Text>
              <Text style={styles.menuHint}>
                {soportado ? "Vencimientos y ahorro diario" : "Solo disponible en el celular"}
              </Text>
            </View>
            <Switch
              value={ajustes.recordatorios}
              onValueChange={handleToggleRecordatorios}
              disabled={!soportado}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.white}
            />
          </View>

          {soportado && (
            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowBorder]}
              onPress={handleProbarNotificacion}
              activeOpacity={0.7}
            >
              <Ionicons name="paper-plane-outline" size={18} color={colors.textDark} style={styles.menuIcon} />
              <Text style={styles.menuLabel}>Probar notificación</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowBorder]}
            onPress={avisarProximamente}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet-outline" size={18} color={colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Métodos de ahorro preferidos</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={avisarProximamente}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed-outline" size={18} color={colors.textDark} style={styles.menuIcon} />
            <Text style={styles.menuLabel}>Seguridad</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textGrey} />
          </TouchableOpacity>
        </View>

        {soportado && <AvisosCard />}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.coral} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  avatarBlock: { alignItems: "center", marginBottom: 24 },
  avatarTouchable: { position: "relative", marginBottom: 6 },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.darkBrown,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 76, height: 76, borderRadius: 38 },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: colors.darkBrown,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.darkBrown,
    marginBottom: 8,
    textDecorationLine: "underline",
  },
  avatarInitials: { color: colors.white, fontSize: 24, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800", color: colors.textDark },
  email: { fontSize: 13, color: colors.textGrey },
  menuCard: { backgroundColor: colors.white, borderRadius: 18, marginBottom: 18 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 14, color: colors.textDark, fontWeight: "600" },
  menuTextBlock: { flex: 1 },
  menuHint: { fontSize: 11, color: colors.textGrey, marginTop: 2 },
  badge: { backgroundColor: colors.goldLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.textDark },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.coralLight,
    borderRadius: 16,
    height: 50,
  },
  logoutText: { color: colors.coral, fontWeight: "700", fontSize: 14, marginLeft: 8 },
});
