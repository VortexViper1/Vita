import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { TabScreen } from "../../src/components/navigation/TabScreen";
import { AsyncView } from "../../src/components/ui/AsyncView";
import { Button } from "../../src/components/ui/Button";
import Card from "../../src/components/ui/Card";
import { ListRow } from "../../src/components/ui/ListRow";
import { Metric } from "../../src/components/ui/Metric";
import { PhotoStack } from "../../src/components/ui/Photostack";
import { Section } from "../../src/components/ui/Section";
import { UnavailableState } from "../../src/components/ui/states";
import { useStackSize } from "../../src/components/ui/Usestacksize";

import { formatNumber, formatShortDate } from "../../src/data/format";
import {
  getProgressPhotos,
  setProgressPhoto,
  type PhotoSlot,
  type ProgressPhotos,
} from "../../src/data/Progressphotos";
import { useBody } from "../../src/data/hooks";
import { refreshProps } from "../../src/data/resource";
import type { BodyData } from "../../src/data/types";

import { useTheme } from "../../src/theme/ThemeProvider";
import { layout, spacing } from "../../src/theme/spacing";

const MAX_HISTORY_ROWS = 7;

const SLOTS: { key: PhotoSlot; label: string }[] = [
  { key: "front", label: "Front" },
  { key: "side", label: "Side" },
  { key: "back", label: "Back" },
];

export default function BodyScreen() {
  const body = useBody();

  return (
    <TabScreen title="Body" subtitle="CORE" {...refreshProps(body)}>
      <AsyncView
        resource={body}
        unavailable={
          <UnavailableState description="Body composition, weight trends and physical metrics will appear here." />
        }
      >
        {(data) => <BodyContent data={data} />}
      </AsyncView>
    </TabScreen>
  );
}

function changeFromPrevious(current: number, previous: number | undefined): string | undefined {
  if (previous === undefined) return undefined;
  const difference = Math.round((current - previous) * 10) / 10;
  if (difference === 0) return "No change";
  return `${difference > 0 ? "+" : "−"}${formatNumber(Math.abs(difference), 1)} kg`;
}

function BodyContent({ data }: { data: BodyData }) {
  const { colors } = useTheme();
  const stackSize = useStackSize();

  const [photos, setPhotos] = useState<ProgressPhotos>({});
  const [active, setActive] = useState(0);
  const slot = SLOTS[active];
  const hasPhoto = Boolean(photos[slot.key]);

  useEffect(() => {
    getProgressPhotos().then(setPhotos);
  }, []);

  async function pick(source: "camera" | "library") {
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            "Camera access needed",
            "Allow camera access in Settings to take a progress photo.",
          );
          return;
        }
      }

      const options = {
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      };
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ["images"] });

      if (result.canceled || !result.assets[0]) return;
      setPhotos(await setProgressPhoto(slot.key, result.assets[0].uri));
    } catch {
      Alert.alert("Couldn't save photo", "Try again.");
    }
  }

  function openPhotoMenu() {
    Alert.alert(`${slot.label} photo`, undefined, [
      { text: "Take photo", onPress: () => pick("camera") },
      { text: "Choose from library", onPress: () => pick("library") },
      ...(hasPhoto
        ? [
            {
              text: "Remove photo",
              style: "destructive" as const,
              onPress: async () => setPhotos(await setProgressPhoto(slot.key, null)),
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ]);
  }

  // Sorted here so the order never depends on how the data source returns it.
  const entries = [...(data.history ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_HISTORY_ROWS + 1);
  const rows = entries.slice(0, MAX_HISTORY_ROWS);

  const change = data.weekChangeKg;

  return (
    <>
      <Metric
        tile
        label="Weight"
        accent={colors.blue}
        value={data.weightKg !== undefined ? formatNumber(data.weightKg, 1) : undefined}
        unit={data.weightKg !== undefined ? "kg" : undefined}
        context={
          change !== undefined
            ? `${change > 0 ? "+" : change < 0 ? "−" : ""}${formatNumber(Math.abs(change), 1)} kg this week`
            : data.weightKg === undefined
              ? "No weight data available"
              : undefined
        }
      />

      <Section title="Progress photos" description="Tap the stack to flip through.">
        <PhotoStack
          size={stackSize}
          onChange={setActive}
          items={SLOTS.map((item) => {
            const uri = photos[item.key];
            return {
              title: item.label,
              subtitle: uri ? undefined : "Photo space",
              image: uri ? { uri } : undefined,
            };
          })}
        />
        <View style={{ marginTop: spacing.lg }}>
          <Button
            variant="secondary"
            label={`${hasPhoto ? "Replace" : "Add"} ${slot.label.toLowerCase()} photo`}
            onPress={openPhotoMenu}
          />
        </View>
      </Section>

      {rows.length > 0 ? (
        <Section title="Measurements" style={{ marginTop: layout.screenPadding }}>
          <Card>
            {rows.map((entry, index) => (
              <ListRow
                key={entry.date}
                label={formatShortDate(entry.date)}
                description={changeFromPrevious(entry.value, entries[index + 1]?.value)}
                value={`${formatNumber(entry.value, 1)} kg`}
                last={index === rows.length - 1}
              />
            ))}
          </Card>
        </Section>
      ) : null}
    </>
  );
}