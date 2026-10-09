import { Pressable, StyleSheet, Text } from "react-native";

import { useTheme } from "../../theme/ThemeProvider";
import { typography } from "../../theme/typography";

interface TextLinkProps {
  /** Plain lead-in, e.g. "New here?" */
  prompt: string;
  /** The tappable part, e.g. "Create an account" */
  actionLabel: string;
  onPress: () => void;
}

export function TextLink({ prompt, actionLabel, onPress }: TextLinkProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${prompt} ${actionLabel}`}
      style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[typography.body, { color: colors.inkSoft }]}>
        {prompt}{" "}
        <Text style={{ color: colors.green, fontWeight: "600" }}>
          {actionLabel}
        </Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});