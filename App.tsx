import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import Controls from './components/Controls';
import { ProcessingParams, ImageState } from './types';
import { DEFAULT_PARAMS } from './constants';
import { processImage } from './utils/imageProcessor';

// Placeholder image for initial state
const DEMO_IMAGE = "https://picsum.photos/800/600"; 

// Custom Logo Component
const Logo = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="pixel-art-logo">
      <path d="M4 8H6V6H8V4H14V6H16V4H18V6H20V12H22V14H20V16H22V20H20V22H18V20H16V22H14V20H10V18H6V20H4V18H2V16H4V14H2V12H4V8Z" fill="white"/>
      <path d="M6 10H8V12H6V10Z" fill="#111"/>
      <path d="M12 10H14V12H12V10Z" fill="#111"/>
      <rect x="0" y="0" width="24" height="24" fill="transparent"/>
    </svg>
);

function App() {
  const [params, setParams] = useState<ProcessingParams>(DEFAULT_PARAMS);
  const [imageState, setImageState] = useState<ImageState>({
    originalSrc: null,
    processedUrl: null,
    width: 0,
    height: 0,
    mediaType: 'image'
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Refs for DOM elements
  const canvasRef = useRef<HTMLCanvasElement>(null); // Display/Export canvas
  const processingCanvasRef = useRef<HTMLCanvasElement | null>(null); // Offscreen processing
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Refs for State (to access latest values inside stable RAF loop)
  const paramsRef = useRef(params);
  const imageStateRef = useRef(imageState);

  // Sync refs with state
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    imageStateRef.current = imageState;
  }, [imageState]);

  // Initialize offscreen canvas
  useEffect(() => {
    processingCanvasRef.current = document.createElement('canvas');
  }, []);

  // Load Demo Image on Mount
  useEffect(() => {
    const loadDemo = async () => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = DEMO_IMAGE;
        img.onload = () => {
            imgRef.current = img;
            setImageState(prev => ({
                ...prev,
                originalSrc: DEMO_IMAGE,
                width: img.naturalWidth,
                height: img.naturalHeight,
                mediaType: 'image'
            }));
        };
    };
    loadDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main Processing Loop - Stable callback using Refs
  const renderFrame = useCallback(() => {
    if (!canvasRef.current || !processingCanvasRef.current) return;

    const currentState = imageStateRef.current;
    const currentParams = paramsRef.current;
    const ctx = canvasRef.current.getContext('2d');
    
    if (!ctx) return;

    // Use video or image source
    let source: CanvasImageSource | null = null;
    let width = 0;
    let height = 0;

    if (currentState.mediaType === 'video' && videoRef.current) {
        source = videoRef.current;
        width = currentState.width;
        height = currentState.height;
    } else if (currentState.mediaType === 'image' && imgRef.current) {
        source = imgRef.current;
        width = currentState.width;
        height = currentState.height;
    }

    if (!source || width === 0 || height === 0) return;

    // 1. Process on small offscreen canvas
    processImage(source, processingCanvasRef.current, currentParams, width, height);

    // 2. Upscale to display canvas (Crisp Pixels)
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(processingCanvasRef.current, 0, 0, width, height);

    // Loop if video
    if (currentState.mediaType === 'video' && videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        requestRef.current = requestAnimationFrame(renderFrame);
    }
  }, []); // Empty dependencies = stable function

  // Effect to trigger render on Param change (for static images)
  useEffect(() => {
    if (imageState.mediaType === 'image') {
       requestAnimationFrame(renderFrame);
    }
    // For video, the loop handles it, but if paused we force a frame update
    if (imageState.mediaType === 'video' && videoRef.current?.paused) {
       requestAnimationFrame(renderFrame);
    }
  }, [params, imageState.mediaType, renderFrame]); // Re-run when params change

  // Manage Video Loop Lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
        // Cancel any existing loop to avoid duplicates
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        renderFrame();
    };

    video.addEventListener('play', onPlay);
    
    // Also check if we should start the loop right now (e.g. state just switched to video and it's already playing)
    if (imageState.mediaType === 'video' && !video.paused && !video.ended) {
         if (requestRef.current) cancelAnimationFrame(requestRef.current);
         renderFrame();
    }

    return () => {
        video.removeEventListener('play', onPlay);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [imageState.mediaType, renderFrame]);


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';

    // Cleanup previous
    if (imageState.originalSrc && imageState.originalSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageState.originalSrc);
    }

    if (type === 'video') {
        if (videoRef.current) {
            videoRef.current.src = objectUrl;
            
            // Use addEventListener for safer event handling
            const onMeta = () => {
                if (videoRef.current) {
                    setImageState({
                        originalSrc: objectUrl,
                        processedUrl: null,
                        width: videoRef.current.videoWidth,
                        height: videoRef.current.videoHeight,
                        mediaType: 'video'
                    });
                    videoRef.current.loop = true;
                    videoRef.current.muted = true;
                    videoRef.current.play().catch(e => console.error("Playback failed", e));
                }
                videoRef.current?.removeEventListener('loadedmetadata', onMeta);
            };
            
            videoRef.current.addEventListener('loadedmetadata', onMeta);
        }
    } else {
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            setImageState({
                originalSrc: objectUrl,
                processedUrl: null,
                width: img.naturalWidth,
                height: img.naturalHeight,
                mediaType: 'image'
            });
            // Stop video if playing
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.src = "";
            }
        };
        img.src = objectUrl;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        handleFile(file);
    }
  };

  const handleExport = () => {
    if (!canvasRef.current) return;

    if (imageState.mediaType === 'image') {
        const link = document.createElement('a');
        link.download = 'pixelcrunch-art.png';
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
    } else if (imageState.mediaType === 'video' && videoRef.current) {
        startVideoExport();
    }
  };

  const startVideoExport = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setIsProcessing(true);
    
    // Setup for recording
    video.pause();
    video.currentTime = 0;
    video.loop = false; // Play once for recording

    const stream = canvas.captureStream(30); // Capture at 30fps
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") 
                     ? "video/webm;codecs=vp9" 
                     : "video/webm";
    
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pixelcrunch-video.webm';
        link.click();
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setIsProcessing(false);
        
        // Restore loop state
        video.loop = true;
        video.play();
    };

    video.onended = () => {
        recorder.stop();
        video.onended = null; // Remove handler
    };

    recorder.start();
    video.play();
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-black text-white overflow-hidden font-sans">
      
      {/* Main Canvas Area */}
      <div 
        className="flex-1 relative bg-[#111] flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hidden Video Source */}
        <video 
            ref={videoRef} 
            className="hidden" 
            playsInline 
            muted 
            crossOrigin="anonymous" 
        />

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ 
                 backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', 
                 backgroundSize: '20px 20px' 
             }} 
        />

        {/* Logo Overlay */}
        <div className="absolute top-0 left-0 p-6 z-20 opacity-50 hover:opacity-100 transition-opacity">
            <Logo />
        </div>

        {/* Drag Overlay */}
        {isDragging && (
            <div className="absolute inset-0 z-50 bg-indigo-500/20 backdrop-blur-sm border-4 border-indigo-500 border-dashed m-4 rounded-3xl flex items-center justify-center">
                <div className="text-2xl font-bold text-indigo-200 animate-pulse">
                    DROP FILE HERE
                </div>
            </div>
        )}

        {/* Canvas Container */}
        <div className="relative shadow-2xl shadow-black/50 group max-w-full max-h-full flex items-center justify-center transition-all duration-300">
            
            {/* The Display Canvas */}
            <canvas 
                ref={canvasRef}
                className="max-w-full max-h-[80vh] object-contain transition-opacity duration-200"
                style={{ 
                    // We handle pixelation via upscaling drawImage, but CSS ensures display looks sharp
                    imageRendering: 'pixelated',
                    opacity: isProcessing ? 0.8 : 1
                }}
            />
            
            {isProcessing && imageState.mediaType === 'image' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                    <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
            )}
            
            {/* Recording Overlay */}
            {isProcessing && imageState.mediaType === 'video' && (
                 <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-2">
                     <div className="w-2 h-2 bg-white rounded-full" />
                     RECORDING
                 </div>
            )}

            {/* Empty State */}
            {!imageState.originalSrc && (
                <div className="text-center p-12 border-2 border-zinc-700 border-dashed rounded-xl bg-zinc-900/50">
                    <ImageIcon className="w-16 h-16 mx-auto text-zinc-600 mb-4" />
                    <p className="text-zinc-400">Upload image or video</p>
                </div>
            )}
        </div>

        {/* Bottom Upload Bar */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
            <label className="cursor-pointer group">
                <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                <div className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-6 py-3 rounded-full shadow-lg border border-zinc-700 flex items-center gap-3 transition-all hover:scale-105 active:scale-95">
                    <Upload className="w-5 h-5 group-hover:text-indigo-400 transition-colors" />
                    <span className="font-medium text-sm">Open File</span>
                </div>
            </label>
        </div>

      </div>

      {/* Sidebar Controls */}
      <Controls 
        params={params} 
        setParams={setParams} 
        onDownload={handleExport}
        onReset={() => setParams(DEFAULT_PARAMS)}
        mediaType={imageState.mediaType}
        isProcessing={isProcessing}
      />

    </div>
  );
}

export default App;