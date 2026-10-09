import React from "react";
import { StyleSheet } from "react-native";

import { TabScreen } from "../navigation/TabScreen";
import { spacing } from "../../theme/spacing";
import { Text } from "./Text";

type ComingSoonScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function ComingSoonScreen({
  eyebrow,
  title,
  description,
}: ComingSoonScreenProps) {
  return (
    <TabScreen title={title} subtitle={eyebrow}>
      <Text variant="label" tone="accent">
        Coming soon
      </Text>

      <Text tone="secondary" style={styles.description}>
        {description}
      </Text>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  description: {
    marginTop: spacing.sm,
    maxWidth: 520,
  },
});

export default ComingSoonScreen;