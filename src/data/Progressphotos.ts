import { supabase } from "../lib/supabase";

export type PhotoSlot = "front" | "side" | "back";
export type ProgressPhotos = Partial<Record<PhotoSlot, string>>;

const BUCKET = "progress-photos";
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

type StoredPhoto = {
  user_id: string;
  slot: PhotoSlot;
  storage_path: string;
};

function getExtension(uri: string): string {
  const cleanUri = uri.split("?")[0] ?? "";
  const match = cleanUri.match(/\.(jpg|jpeg|png|webp|heic)$/i);

  return match?.[1]?.toLowerCase() ?? "jpg";
}

function getContentType(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    default:
      return "image/jpeg";
  }
}

async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Unable to verify your account: ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Please sign in to save progress photos.");
  }

  return data.user.id;
}

/**
 * Loads the signed-in user's progress photos and returns signed URLs
 * suitable for React Native Image components.
 */
export async function getProgressPhotos(): Promise<ProgressPhotos> {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from("progress_photos")
    .select("user_id, slot, storage_path")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to load progress photos: ${error.message}`);
  }

  const photos: ProgressPhotos = {};

  for (const photo of (data ?? []) as StoredPhoto[]) {
    const { data: signed, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(photo.storage_path, SIGNED_URL_SECONDS);

    if (signedError || !signed?.signedUrl) {
      console.warn(
        `Could not load the ${photo.slot} progress photo:`,
        signedError?.message,
      );
      continue;
    }

    photos[photo.slot] = signed.signedUrl;
  }

  return photos;
}

/**
 * Uploads or replaces a photo.
 * Passing null clears the selected slot.
 */
export async function setProgressPhoto(
  slot: PhotoSlot,
  uri: string | null,
): Promise<ProgressPhotos> {
  const userId = await getAuthenticatedUserId();

  if (uri === null) {
    const { data: existing, error: lookupError } = await supabase
      .from("progress_photos")
      .select("storage_path")
      .eq("user_id", userId)
      .eq("slot", slot)
      .maybeSingle();

    if (lookupError) {
      throw new Error(
        `Unable to find the photo to delete: ${lookupError.message}`,
      );
    }

    if (existing?.storage_path) {
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([existing.storage_path]);

      if (removeError) {
        throw new Error(
          `Unable to delete the photo file: ${removeError.message}`,
        );
      }
    }

    const { error: deleteError } = await supabase
      .from("progress_photos")
      .delete()
      .eq("user_id", userId)
      .eq("slot", slot);

    if (deleteError) {
      throw new Error(
        `Unable to clear the photo slot: ${deleteError.message}`,
      );
    }

    return getProgressPhotos();
  }

  // Read the local image selected by Expo ImagePicker.
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error("Unable to read the selected image from this device.");
  }

  const imageBlob = await response.blob();
  const extension = getExtension(uri);
  const storagePath = `${userId}/${slot}.${extension}`;

  // Upload privately. Replacing a slot overwrites the previous file.
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, imageBlob, {
      contentType: getContentType(storagePath),
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Photo upload failed: ${uploadError.message}`);
  }

  const { error: saveError } = await supabase
    .from("progress_photos")
    .upsert(
      {
        user_id: userId,
        slot,
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,slot" },
    );

  if (saveError) {
    throw new Error(
      `The image uploaded, but its record could not be saved: ${saveError.message}`,
    );
  }

  return getProgressPhotos();
}
