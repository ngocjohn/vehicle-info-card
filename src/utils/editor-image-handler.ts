import { HomeAssistant } from 'custom-card-helpers';
import { fireEvent } from 'custom-card-helpers';
/**
 * Upload a file to the server
 * @param hass
 * @param file
 */

export async function uploadImage(hass: HomeAssistant, file: File): Promise<string | null> {
  console.log('Uploading image:', file.name);
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/image/upload', {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${hass.auth.data.access_token}`,
    },
  });

  if (!response.ok) {
    console.error('Failed to upload image, response status:', response.status);
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  const imageId = data.id;

  if (!imageId) {
    console.error('Image ID is missing in the response');
    return null;
  }

  return `/api/image/serve/${imageId}/original`;
}

export function imageInputChange(editor: any, ev: Event, index?: number): void {
  ev.stopPropagation();
  const input = ev.target as HTMLInputElement;
  const url = input.value;

  if (!url || !editor._config) return;

  const images = [...editor._config.images];

  if (index !== undefined) {
    // Update existing image
    images[index] = { ...images[index], url, title: url };
  } else {
    // Add new image
    images.push({ url, title: url });
    input.value = '';
  }

  editor._config = { ...editor._config, images };
  console.log(index !== undefined ? 'Image changed:' : 'New image added:', url);
  editor.configChanged();
}

export async function handleFilePicked(editor: any, ev: any): Promise<void> {
  console.log('File picked');
  const input = ev.target as HTMLInputElement;
  const errorMsg = ev.target.errorMsg;
  const toastId = ev.target.toastId;

  if (!input.files || input.files.length === 0) {
    console.log('No files selected.');
    return;
  }

  const files = Array.from(input.files); // Convert FileList to Array for easier iteration

  for (const file of files) {
    try {
      const imageUrl = await uploadImage(editor.hass, file);
      if (!imageUrl) continue;

      const imageName = file.name.toUpperCase();
      _addImage(editor, imageUrl, imageName);
    } catch (error) {
      console.error('Error uploading image:', error);
      editor.launchToast(toastId, errorMsg);
    }
  }
}

function _addImage(editor: any, url: string, title: string): void {
  console.log('Image added:', url);
  if (editor._config) {
    const images = [...editor._config.images];
    images.push({ url, title });
    editor._config = { ...editor._config, images };
    editor.configChanged();
  }
}

export function addNewImageUrl(editor: any): void {
  if (!editor._newImageUrl || !editor._config) return;
  const images = [...editor._config.images];
  images.push({ url: editor._newImageUrl, title: editor._newImageUrl });
  editor._config = { ...editor._config, images };
  editor._newImageUrl = '';
  editor.configChanged();
}
