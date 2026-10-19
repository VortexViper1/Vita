
import { supabase } from "../lib/supabase";

export type Supplement = {
  id: string;
  name: string;
  dosage: string;
  time: string;
  takenToday: boolean;
};

type SupplementRow = {
  id: string;
  name: string;
  dosage: string;
  reminder_time: string;
};

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  if (!user) {
    throw new Error("Please log in to manage your supplements.");
  }

  return user.id;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function getSupplements(): Promise<Supplement[]> {
  const userId = await getCurrentUserId();
  const today = getLocalDate();

  const { data: supplementRows, error: supplementsError } =
    await supabase
      .from("user_supplements")
      .select("id, name, dosage, reminder_time")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

  throwIfError(supplementsError);

  const { data: logs, error: logsError } = await supabase
    .from("supplement_logs")
    .select("supplement_id")
    .eq("user_id", userId)
    .eq("taken_date", today);

  throwIfError(logsError);

  const takenIds = new Set(
    (logs ?? []).map((log) => log.supplement_id),
  );

  return ((supplementRows ?? []) as SupplementRow[]).map(
    (supplement) => ({
      id: supplement.id,
      name: supplement.name,
      dosage: supplement.dosage,
      time: supplement.reminder_time,
      takenToday: takenIds.has(supplement.id),
    }),
  );
}

export async function addSupplement(
  name: string,
  dosage: string,
  time: string,
): Promise<Supplement> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("user_supplements")
    .insert({
      user_id: userId,
      name: name.trim(),
      dosage: dosage.trim(),
      reminder_time: time.trim(),
    })
    .select("id, name, dosage, reminder_time")
    .single();

  throwIfError(error);

  if (!data) {
    throw new Error("Could not save the supplement.");
  }

  return {
    id: data.id,
    name: data.name,
    dosage: data.dosage,
    time: data.reminder_time,
    takenToday: false,
  };
}

export async function toggleSupplement(
  id: string,
): Promise<void> {
  const userId = await getCurrentUserId();
  const today = getLocalDate();

  const { data: existingLog, error: lookupError } = await supabase
    .from("supplement_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("supplement_id", id)
    .eq("taken_date", today)
    .maybeSingle();

  throwIfError(lookupError);

  if (existingLog) {
    const { error } = await supabase
      .from("supplement_logs")
      .delete()
      .eq("id", existingLog.id)
      .eq("user_id", userId);

    throwIfError(error);
    return;
  }

  const { error } = await supabase
    .from("supplement_logs")
    .insert({
      user_id: userId,
      supplement_id: id,
      taken_date: today,
    });

  throwIfError(error);
}

export async function deleteSupplement(
  id: string,
): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("user_supplements")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  throwIfError(error);
}
