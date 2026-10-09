import AsyncStorage from "@react-native-async-storage/async-storage";

export type Supplement = {
  id: string;
  name: string;
  dosage: string;
  time: string;
  takenToday: boolean;
};

const STORAGE_KEY = "@healthtracker/supplements";

export async function getSupplements(): Promise<Supplement[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function saveSupplements(
  supplements: Supplement[],
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(supplements),
  );
}

export async function addSupplement(
  name: string,
  dosage: string,
  time: string,
): Promise<Supplement> {
  const supplements = await getSupplements();

  const supplement: Supplement = {
    id: `${Date.now()}`,
    name,
    dosage,
    time,
    takenToday: false,
  };

  await saveSupplements([
    ...supplements,
    supplement,
  ]);

  return supplement;
}

export async function toggleSupplement(
  id: string,
): Promise<void> {
  const supplements = await getSupplements();

  await saveSupplements(
    supplements.map((supplement) =>
      supplement.id === id
        ? {
            ...supplement,
            takenToday: !supplement.takenToday,
          }
        : supplement,
    ),
  );
}

export async function deleteSupplement(
  id: string,
): Promise<void> {
  const supplements = await getSupplements();

  await saveSupplements(
    supplements.filter(
      (supplement) => supplement.id !== id,
    ),
  );
}