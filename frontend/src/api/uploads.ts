import { getToken } from './auth';

export interface UploadedImage {
  url: string;
  filename: string;
}

export const uploadsApi = {
  /**
   * Téléverse une image pour l'éditeur Wysiwyg.
   * Le fichier est stocké côté serveur dans files/editor/<userId>/ et
   * l'URL retournée pointe vers /files/editor/<userId>/<nom généré>.
   */
  async uploadEditorImage(file: File): Promise<UploadedImage> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/uploads/image', {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || `Erreur lors du téléversement (${response.status})`);
    }

    return data as UploadedImage;
  },
};
