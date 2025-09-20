const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const callGeminiApi = async (action: string, payload: object) => {
    try {
        const response = await fetch('/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...payload }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'An error occurred while calling the API function.');
        }

        return result;
    } catch (error) {
        console.error(`Error in action [${action}]:`, error);
        let message = "An unexpected error occurred while communicating with the server.";
        if (error instanceof Error) {
            message = error.message;
        }
        throw new Error(message);
    }
}


export const editImage = async (imageFile: File, prompt: string): Promise<{ image: string | null; text: string | null }> => {
  const imageBase64 = await fileToBase64(imageFile);
  return callGeminiApi('editImage', { image: imageBase64, prompt });
};

export const editImageWithMask = async (imageFile: File, maskBlob: Blob, prompt: string): Promise<{ image: string | null; text: string | null }> => {
  const imageBase64 = await fileToBase64(imageFile);
  const maskBase64 = await fileToBase64(maskBlob);
  return callGeminiApi('editImageWithMask', { image: imageBase64, mask: maskBase64, prompt });
};

export const getCreativeIdeas = async (imageFile: File): Promise<string[] | null> => {
  const imageBase64 = await fileToBase64(imageFile);
  const result = await callGeminiApi('getCreativeIdeas', { image: imageBase64 });
  return result.ideas || null;
};

export const generateImages = async (prompt: string, numberOfImages: number, aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'): Promise<string[]> => {
  const result = await callGeminiApi('generateImages', { prompt, numberOfImages, aspectRatio });
  return result.images || [];
};