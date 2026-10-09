import React from "react";
import { StyleSheet, View } from "react-native";

import { layout } from "../../theme/spacing";

/** Two-column grid. Pass `<Metric tile square />` children; odd counts stay aligned. */
export function TileGrid({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((pair, r) => (
        <View key={r} style={styles.row}>
          {pair.map((item, c) => (
            <View key={c} style={styles.cell}>
              {item}
            </View>
          ))}
          {pair.length === 1 ? <View style={styles.cell} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: layout.tileGap, marginTop: layout.tileGap },
  row: { flexDirection: "row", alignItems: "flex-start", gap: layout.tileGap },
  cell: { flex: 1 },
});