// Wrappers around Capacitor native plugins, with browser fallbacks.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNative = Capacitor.isNativePlatform();

// ---------- Haptics ----------

export async function tap() {
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch { /* not supported */ }
}

export async function success() {
  try { await Haptics.notification({ type: NotificationType.Success }); } catch { /* not supported */ }
}

export async function warning() {
  try { await Haptics.notification({ type: NotificationType.Warning }); } catch { /* not supported */ }
}

// ---------- System UI ----------

export async function applySystemTheme(dark) {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? '#121212' : '#0d9488' });
  } catch { /* ignore */ }
}

export async function hideSplash() {
  if (isNative) await SplashScreen.hide();
}

// ---------- Photos (medical certificates etc.) ----------

// Opens the camera or gallery and saves the picture in the app's private
// storage. Returns the stored file path, or null if the user cancelled.
export async function takePhoto() {
  let photo;
  try {
    photo = await Camera.getPhoto({
      quality: 70,
      width: 1280,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      promptLabelHeader: 'Attach proof',
      promptLabelPhoto: 'Choose from gallery',
      promptLabelPicture: 'Take photo',
    });
  } catch (e) {
    if (/cancel/i.test(e?.message)) return null;
    throw e;
  }
  const path = `proofs/${Date.now()}.${photo.format || 'jpeg'}`;
  await Filesystem.writeFile({ path, data: photo.base64String, directory: Directory.Data, recursive: true });
  return path;
}

export async function loadPhoto(path) {
  const ext = path.split('.').pop();
  const { data } = await Filesystem.readFile({ path, directory: Directory.Data });
  return typeof data === 'string'
    ? `data:image/${ext};base64,${data}`
    : URL.createObjectURL(data);
}

export async function deletePhoto(path) {
  try { await Filesystem.deleteFile({ path, directory: Directory.Data }); } catch { /* already gone */ }
}

// ---------- Exporting files ----------

// content: string (text files) or base64 string (binary, e.g. PDF).
export async function shareFile({ fileName, content, mimeType, base64 = false, title }) {
  if (!isNative) {
    const blob = base64
      ? new Blob([Uint8Array.from(atob(content), (c) => c.charCodeAt(0))], { type: mimeType })
      : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: content,
    directory: Directory.Cache,
    ...(base64 ? {} : { encoding: Encoding.UTF8 }),
  });
  try {
    await Share.share({ title, url: uri, dialogTitle: title });
  } catch (e) {
    if (!/cancel/i.test(e?.message)) throw e;
  }
}
