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

function ensureDirectory(): Directory | null {
  const directory = photoDirectory();
  if (!directory) return null;
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
  return directory;
}

/**
 * Keeps a product photo on the device. Picked photos are copied; Open Food
 * Facts images are downloaded. If a download fails (for example offline), the
 * remote URL is returned so the image can still appear when a connection returns.
 */
export async function persistPhoto(sourceUri: string, ratingId: string): Promise<string> {
  if (Platform.OS === 'web') return sourceUri;
  const isRemote = /^https?:\/\//i.test(sourceUri);
  if (!isRemote && !sourceUri.startsWith('file://')) return sourceUri;

  const directory = ensureDirectory();
  if (!directory) return sourceUri;

  const destination = new File(
    directory,
    `${ratingId}-${Date.now()}.${extensionFor(sourceUri)}`,
  );

  try {
    if (isRemote) {
      const downloaded = await File.downloadFileAsync(sourceUri, destination);
      return downloaded.uri;
    }
    const source = new File(sourceUri);
    await source.copy(destination);
    return destination.uri;
  } catch (error) {
    console.warn('[TasteRank] Could not keep photo locally', error);
    return sourceUri;
  }
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
