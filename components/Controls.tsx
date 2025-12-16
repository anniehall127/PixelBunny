import React from 'react';
import { DitherMethod, Palette, ProcessingParams } from '../types';
import { PALETTES } from '../constants';
import { 
    Sliders, 
    Palette as PaletteIcon, 
    Grid, 
    Zap,
    Download,
    RefreshCw,
    Video,
    Plus,
    X
} from 'lucide-react';

interface ControlsProps {
    params: ProcessingParams;
    setParams: React.Dispatch<React.SetStateAction<ProcessingParams>>;
    onDownload: () => void;
    onReset: () => void;
    mediaType: 'image' | 'video';
    isProcessing: boolean;
}

const Controls: React.FC<ControlsProps> = ({ params, setParams, onDownload, onReset, mediaType, isProcessing }) => {
    
    const handleChange = (key: keyof ProcessingParams, value: any) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const handleColorChange = (index: number, newColor: string) => {
        const newColors = [...params.palette.colors];
        newColors[index] = newColor;
        setParams(prev => ({
            ...prev,
            palette: { name: 'Custom', colors: newColors }
        }));
    };

    const addColor = () => {
        // Add a default color (mid-gray or contrasting)
        const newColors = [...params.palette.colors, '#888888'];
        setParams(prev => ({
            ...prev,
            palette: { name: 'Custom', colors: newColors }
        }));
    };

    const removeColor = (index: number) => {
        if (params.palette.colors.length <= 2) return;
        const newColors = params.palette.colors.filter((_, i) => i !== index);
        setParams(prev => ({
            ...prev,
            palette: { name: 'Custom', colors: newColors }
        }));
    };

    return (
        <div className="w-full md:w-80 flex-shrink-0 bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto custom-scrollbar p-6 space-y-8 shadow-xl z-10">
            
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-mono text-zinc-100 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-400" />
                    Settings
                </h2>
                <button 
                    onClick={onReset}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                    title="Reset to Defaults"
                >
                    <RefreshCw className="w-4 h-4 text-zinc-500" />
                </button>
            </div>

            {/* Pixel Size */}
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <label className="text-zinc-400 flex items-center gap-2">
                        <Grid className="w-4 h-4" /> Pixel Scale
                    </label>
                    <span className="text-indigo-400 font-mono">{params.pixelSize}px</span>
                </div>
                <input 
                    type="range" 
                    min="1" 
                    max="32" 
                    step="1"
                    value={params.pixelSize}
                    onChange={(e) => handleChange('pixelSize', parseInt(e.target.value))}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-zinc-500">Larger = chunkier pixels.</p>
            </div>

            {/* Adjustments */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-300">Tone Adjustments</h3>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-500">
                        <span>Contrast</span>
                        <span>{params.contrast}</span>
                    </div>
                    <input 
                        type="range" 
                        min="-100" 
                        max="100" 
                        value={params.contrast}
                        onChange={(e) => handleChange('contrast', parseInt(e.target.value))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-500">
                        <span>Brightness</span>
                        <span>{params.brightness}</span>
                    </div>
                    <input 
                        type="range" 
                        min="-100" 
                        max="100" 
                        value={params.brightness}
                        onChange={(e) => handleChange('brightness', parseInt(e.target.value))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>

            {/* Dithering */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
                <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Dither Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.values(DitherMethod).map((method) => (
                        <button
                            key={method}
                            onClick={() => handleChange('ditherMethod', method)}
                            className={`px-3 py-2 text-xs rounded-md text-left transition-all ${
                                params.ditherMethod === method 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                        >
                            {method}
                        </button>
                    ))}
                </div>
                
                <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs text-zinc-500">
                        <span>Dither Strength</span>
                        <span>{Math.round(params.ditherAmount * 100)}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05"
                        value={params.ditherAmount}
                        onChange={(e) => handleChange('ditherAmount', parseFloat(e.target.value))}
                        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                </div>
            </div>

            {/* Palette */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
                <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <PaletteIcon className="w-4 h-4" /> Palette
                </label>
                
                {/* Presets */}
                <div className="grid grid-cols-1 gap-2">
                    {PALETTES.map((p, idx) => (
                        <button
                            key={p.name}
                            onClick={() => handleChange('palette', p)}
                            className={`group flex items-center gap-3 p-2 rounded-lg transition-all border ${
                                params.palette.name === p.name 
                                ? 'bg-zinc-800 border-indigo-500 ring-1 ring-indigo-500' 
                                : 'bg-transparent border-zinc-800 hover:bg-zinc-800'
                            }`}
                        >
                            <div className="flex rounded overflow-hidden ring-1 ring-zinc-700/50">
                                {p.colors.map(c => (
                                    <div key={c} style={{ backgroundColor: c }} className="w-4 h-4" />
                                ))}
                            </div>
                            <span className={`text-xs ${params.palette.name === p.name ? 'text-white' : 'text-zinc-400'}`}>
                                {p.name}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Custom Editor */}
                <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2 border border-zinc-800 mt-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Active Colors</span>
                        <span className="text-[10px] text-zinc-500">{params.palette.colors.length} colors</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {params.palette.colors.map((color, idx) => (
                            <div key={idx} className="group relative">
                                <div className="w-8 h-8 rounded-md overflow-hidden ring-1 ring-zinc-600 relative cursor-pointer hover:ring-indigo-400 transition-all">
                                    <input 
                                        type="color" 
                                        value={color}
                                        onChange={(e) => handleColorChange(idx, e.target.value)}
                                        className="absolute inset-0 w-[150%] h-[150%] -top-1/4 -left-1/4 p-0 border-0 cursor-pointer opacity-0"
                                        title={color}
                                    />
                                    <div 
                                        className="w-full h-full pointer-events-none" 
                                        style={{ backgroundColor: color }} 
                                    />
                                </div>
                                {params.palette.colors.length > 2 && (
                                    <button 
                                        onClick={() => removeColor(idx)}
                                        className="absolute -top-1.5 -right-1.5 bg-zinc-900 text-zinc-400 hover:text-red-400 rounded-full p-0.5 shadow-sm ring-1 ring-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove Color"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                        
                        <button 
                            onClick={addColor}
                            className="w-8 h-8 rounded-md border border-dashed border-zinc-600 flex items-center justify-center text-zinc-500 hover:text-indigo-400 hover:border-indigo-400 transition-colors bg-transparent hover:bg-zinc-800"
                            title="Add Color"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="pt-6 mt-auto">
                <button 
                    onClick={onDownload}
                    disabled={isProcessing}
                    className={`w-full py-3 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all transform ${
                        isProcessing 
                        ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                        : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                >
                    {isProcessing ? (
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : mediaType === 'video' ? (
                        <>
                            <Video className="w-5 h-5" />
                            Export Video
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            Download Image
                        </>
                    )}
                </button>
                {mediaType === 'video' && !isProcessing && (
                     <p className="text-center text-xs text-zinc-500 mt-2">
                         Video export records playback in real-time.
                     </p>
                )}
            </div>
        </div>
    );
};

export default Controls;