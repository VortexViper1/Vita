import AsyncStorage from "@react-native-async-storage/async-storage";

export type PhotoSlot = "front" | "side" | "back";
export type ProgressPhotos = Partial<Record<PhotoSlot, string>>;

const KEY = "@health_tracker/progress_photos";

export async function getProgressPhotos(): Promise<ProgressPhotos> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProgressPhotos) : {};
  } catch {
    return {};
  }
}

/** Saves (or clears, with null) one slot and returns the updated set. */
export async function setProgressPhoto(
  slot: PhotoSlot,
  uri: string | null,
): Promise<ProgressPhotos> {
  const next = { ...(await getProgressPhotos()) };
  if (uri) next[slot] = uri;
  else delete next[slot];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}