import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PASSWORD_RULES } from "../utils/passwordValidation";
import colors from "../constants/colors";

// Muestra la lista de requisitos de la contraseña, marcando en verde los que ya se cumplen.
// Recibe la contraseña actual por props para saber qué reglas ya pasó.
export default function PasswordChecklist({ password }) {
  return (
    <View style={styles.container}>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <View key={rule.id} style={styles.row}>
            <Ionicons
              name={passed ? "checkmark-circle" : "ellipse-outline"}
              size={16}
              color={passed ? colors.success : colors.textGrey}
            />
            <Text style={[styles.label, passed && styles.labelPassed]}>
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textGrey,
    marginLeft: 6,
  },
  labelPassed: {
    color: colors.success,
    fontWeight: "600",
  },
});