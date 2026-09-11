export const PASSWORD_RULES = [
  {
    id: "minLength",
    label: "Mínimo 8 caracteres",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "Al menos una mayúscula",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Al menos una minúscula",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "Al menos un número",
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: "special",
    label: "Al menos un símbolo (!@#$%...)",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export function isPasswordValid(password) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}