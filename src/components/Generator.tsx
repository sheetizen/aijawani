import React, { useState, useRef } from 'react';
import { generateImages, generateWithReference } from '../services/geminiService';
import { DownloadIcon } from './icons/DownloadIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { UploadIcon } from './icons/UploadIcon';
import { XIcon } from './icons/XIcon';

interface GeneratorProps {
    onSendToEditor: (imageUrl: string) => void;
}

type Mode = 'no-reference' | 'with-reference';
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

const aspectRatios: { id: AspectRatio, name: string }[] = [
    { id: '1:1', name: 'Square' },
    { id: '16:9', name: 'Landscape' },
    { id: '9:16', name: 'Portrait' },
    { id: '4:3', name: 'Standard' },
    { id: '3:4', name: 'Vertical' },
];

const imageCounts = [1, 2, 3, 4];

export const Generator: React.FC<GeneratorProps> = ({ onSendToEditor }) => {
    const [mode, setMode] = useState<Mode>('no-reference');
    const [prompt, setPrompt] = useState('');
    const [referenceImages, setReferenceImages] = useState<File[]>([]);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [numberOfImages, setNumberOfImages] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        setError(null);
        setGeneratedImages([]);
        setReferenceImages([]);
        setPrompt('');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setReferenceImages(prev => [...prev, ...Array.from(event.target.files)]);
            // Reset the input value to allow uploading the same file again
            event.target.value = '';
        }
    };

    const removeReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) {
            setError("Please enter a prompt.");
            return;
        }
        if (mode === 'with-reference' && referenceImages.length === 0) {
            setError("Please upload at least one reference image.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            if (mode === 'no-reference') {
                const images = await generateImages(prompt, numberOfImages, aspectRatio);
                setGeneratedImages(images);
            } else {
                const result = await generateWithReference(prompt, referenceImages);
                if (result.image) {
                    setGeneratedImages([result.image]);
                } else {
                    setError(result.text || "The AI could not generate an image from your request. Please try again.");
                }
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (imageUrl: string, index: number) => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `jawani-generated-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full flex flex-col items-center space-y-4 max-w-4xl">
            <div className="w-full bg-gray-50 dark:bg-gray-950 p-6 rounded-lg">
                <div className="flex justify-center space-x-1 mb-6 p-1 bg-gray-200 dark:bg-gray-800 rounded-full">
                    <button onClick={() => handleModeChange('no-reference')} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors w-1/2 ${mode === 'no-reference' ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white' : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}>
                        No Reference
                    </button>
                    <button onClick={() => handleModeChange('with-reference')} className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors w-1/2 ${mode === 'with-reference' ? 'bg-white text-black shadow-sm dark:bg-black dark:text-white' : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'}`}>
                        With Reference
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'with-reference' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Reference Images</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                                {referenceImages.map((file, index) => (
                                    <div key={index} className="relative aspect-square group">
                                        <img src={URL.createObjectURL(file)} alt={`reference ${index}`} className="w-full h-full object-cover rounded-md" />
                                        <button type="button" onClick={() => removeReferenceImage(index)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center aspect-square bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    <UploadIcon className="w-6 h-6 text-gray-500" />
                                    <span className="text-xs text-gray-500 mt-1">Add</span>
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label htmlFor="prompt-input" className="sr-only">Image Prompt</label>
                        <textarea
                            id="prompt-input"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={mode === 'no-reference' ? "A vibrant oil painting of a robot..." : "Describe what you want to generate based on the references..."}
                            className="w-full px-4 py-3 text-base bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition-shadow resize-none"
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>

                    {mode === 'no-reference' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aspect Ratio</label>
                                <div className="flex flex-wrap gap-2">
                                    {aspectRatios.map(ratio => (
                                        <button key={ratio.id} type="button" onClick={() => setAspectRatio(ratio.id)} disabled={isLoading} className={`px-3 py-1.5 text-sm rounded-md transition-colors ${aspectRatio === ratio.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                            {ratio.name} ({ratio.id})
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Images</label>
                                <div className="flex flex-wrap gap-2">
                                    {imageCounts.map(count => (
                                        <button key={count} type="button" onClick={() => setNumberOfImages(count)} disabled={isLoading} className={`w-10 h-10 text-sm rounded-md transition-colors ${numberOfImages === count ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                            {count}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        className="w-full px-6 py-3 bg-black text-white dark:bg-white dark:text-black font-semibold rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                                <span>Generating...</span>
                            </>
                        ) : (
                            'Generate'
                        )}
                    </button>
                </form>
            </div>
            
            {error && <p className="text-red-500 mt-2 text-center">{error}</p>}
            
            <div className="w-full mt-8">
                {isLoading && (
                    <div className="text-center p-8">
                        <p className="text-gray-500 dark:text-gray-400">The AI is creating your masterpiece. This may take a moment...</p>
                    </div>
                )}

                {generatedImages.length > 0 && (
                    <div className={`grid gap-4 grid-cols-1 ${generatedImages.length > 1 ? 'md:grid-cols-2' : 'max-w-xl mx-auto'}`}>
                        {generatedImages.map((imageSrc, index) => (
                            <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                <img src={imageSrc} alt={`Generated image ${index + 1}`} className="w-full h-full object-contain bg-gray-100 dark:bg-gray-800" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button onClick={() => handleDownload(imageSrc, index)} title="Download Image" className="p-3 bg-white/80 text-black rounded-full hover:bg-white transition-colors">
                                        <DownloadIcon className="w-6 h-6" />
                                    </button>
                                    <button onClick={() => onSendToEditor(imageSrc)} title="Send to Editor" className="p-3 bg-white/80 text-black rounded-full hover:bg-white transition-colors">
                                        <PaperAirplaneIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
