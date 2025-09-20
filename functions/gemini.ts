import { GoogleGenAI, Modality, Type } from "@google/genai";

// Cloudflare Pages function environment variables
interface Env {
  API_KEY: string;
}

// FIX: Define the PagesFunction type for Cloudflare Pages, as it's not globally available in this context.
type PagesFunction<EnvT = unknown> = (context: { request: Request; env: EnvT }) => Promise<Response>;

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

// onRequestPost is the handler for POST requests in Cloudflare Pages Functions.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.API_KEY) {
    return new Response(JSON.stringify({ error: "API_KEY environment variable not set" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const ai = new GoogleGenAI({ apiKey: env.API_KEY });
  
  try {
    const body = await request.json();
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
            const result = processApiResponse(response);
            return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
            const result = processApiResponse(response);
            return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
            return new Response(JSON.stringify({ ideas: result.ideas || null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
               return new Response(JSON.stringify({ error: "The AI did not generate any images. This might be due to the safety policy." }), { status: 500, headers: { 'Content-Type': 'application/json' } });
            }

            const images = response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);
            return new Response(JSON.stringify({ images }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        default:
            return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error("Error in Gemini function:", error);
    const message = error instanceof Error ? error.message : "An unknown internal error occurred.";
    return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
  }
};
