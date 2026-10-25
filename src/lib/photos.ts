import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

const PHOTO_DIR = 'rating-photos';

function photoDirectory(): Directory | null {
  if (Platform.OS === 'web') return null;
  return new Directory(Paths.document, PHOTO_DIR);
}

function extensionFor(uri: string): string {
  const match = /\.([a-zA-Z0-9]{2,5})(?:\?|#|$)/.exec(uri);
  const ext = match?.[1]?.toLowerCase();
  if (!ext) return 'jpg';
  return ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
}

/**
 * Copies a freshly picked photo into the app's document directory so it survives
 * restarts, cache eviction and being removed from the gallery.
 */
export async function persistPhoto(sourceUri: string, ratingId: string): Promise<string> {
  if (Platform.OS === 'web') return sourceUri;
  if (!sourceUri.startsWith('file://')) return sourceUri;

  const directory = photoDirectory();
  if (!directory) return sourceUri;
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }

  const destination = new File(
    directory,
    `${ratingId}-${Date.now()}.${extensionFor(sourceUri)}`,
  );
  const source = new File(sourceUri);
  await source.copy(destination);
  return destination.uri;
}

/** Deletes a stored photo. Safe to call for remote URIs, missing files or on web. */
export async function deletePhoto(uri: string | null | undefined): Promise<void> {
  if (!uri || Platform.OS === 'web' || !uri.startsWith('file://')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('[TasteRank] Could not delete photo', error);
  }
}
