import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const parseDataUrl = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(.*);base64,(.*)$/);
    if (!match) throw new Error('Invalid data URL');
    return { mimeType: match[1], data: match[2] };
};

const processApiResponse = (response: any) => {
    let editedImageBase64: string | null = null;
    let responseText: string | null = null;

    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          editedImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
        }
        if (part.text) {
          responseText = part.text;
        }
      }
    }
    
    if(!editedImageBase64 && !responseText) {
        responseText = "No content was generated. The request may have been blocked.";
    }

    return { image: editedImageBase64, text: responseText };
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { action } = body;

        switch (action) {
            case 'editImage': {
                const { mimeType, data } = parseDataUrl(body.image);
                const imagePart = { inlineData: { data, mimeType } };
                const textPart = { text: body.prompt };

                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash-image-preview',
                  contents: { parts: [imagePart, textPart] },
                  config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                return { statusCode: 200, body: JSON.stringify(processApiResponse(response)) };
            }

            case 'editImageWithMask': {
                const image = parseDataUrl(body.image);
                const mask = parseDataUrl(body.mask);
                const imagePart = { inlineData: { data: image.data, mimeType: image.mimeType } };
                const maskPart = { inlineData: { data: mask.data, mimeType: 'image/png' } };
                const textPart = { text: body.prompt };

                const response = await ai.models.generateContent({
                  model: 'gemini-2.5-flash-image-preview',
                  contents: { parts: [imagePart, maskPart, textPart] },
                  config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
                });
                return { statusCode: 200, body: JSON.stringify(processApiResponse(response)) };
            }

            case 'getCreativeIdeas': {
                const { mimeType, data } = parseDataUrl(body.image);
                const imagePart = { inlineData: { data, mimeType } };
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [ { text: "You are a creative photo editing assistant. Analyze the following image and provide 3-4 distinct, creative ideas for how to edit it. Each idea should be a short, actionable sentence that can be used as a prompt for an AI image editor. Return the ideas as a JSON array of strings." }, imagePart ] },
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: { type: Type.OBJECT, properties: { ideas: { type: Type.ARRAY, items: { type: Type.STRING } } } },
                    },
                });
                const jsonString = response.text;
                const result = JSON.parse(jsonString);
                return { statusCode: 200, body: JSON.stringify({ ideas: result.ideas || null }) };
            }

            case 'generateImages': {
                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: body.prompt,
                    config: {
                        numberOfImages: body.numberOfImages,
                        outputMimeType: 'image/png',
                        aspectRatio: body.aspectRatio,
                    },
                });

                if (!response.generatedImages || response.generatedImages.length === 0) {
                   return { statusCode: 500, body: JSON.stringify({ error: "The AI did not generate any images. This might be due to the safety policy." }) };
                }
    
                const images = response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
                return { statusCode: 200, body: JSON.stringify({ images }) };
            }

            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid action' }) };
        }

    } catch (error) {
        console.error("Error in Gemini function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error instanceof Error ? error.message : "An unknown internal error occurred." }),
        };
    }
};

export { handler };