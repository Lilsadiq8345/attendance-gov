import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera as CameraIcon, CheckCircle, AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
// Dynamic imports for MediaPipe to handle loading issues
// Use refs to store loaded modules to avoid global variable issues

interface BiometricData {
    faceFeatures: number[];
    earFeatures: number[];
    earLeftFeatures?: number[];
    earRightFeatures?: number[];
    confidence: number;
    timestamp: string;
    verification_type: 'face' | 'ear' | 'both';
}

interface RealTimeBiometricScannerProps {
    onScanComplete: (data: BiometricData) => void;
    onError: (error: string) => void;
    scanType: 'face' | 'ear' | 'both';
    maxAttempts?: number;
    mode?: 'registration' | 'verification';
}

const RealTimeBiometricScanner: React.FC<RealTimeBiometricScannerProps> = ({
    onScanComplete,
    onError,
    scanType,
    maxAttempts = 3,
    mode = 'verification'
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationRef = useRef<number | null>(null);
    const faceMeshRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);

    // Refs to store loaded MediaPipe modules
    const faceMeshModuleRef = useRef<any>(null);
    const drawingUtilsModuleRef = useRef<any>(null);
    const cameraUtilsModuleRef = useRef<any>(null);

    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState<'initializing' | 'detecting' | 'processing' | 'complete' | 'error'>('initializing');
    const [attempts, setAttempts] = useState(0);
    const [detectionConfidence, setDetectionConfidence] = useState(0);
    const [faceDetected, setFaceDetected] = useState(false);
    const [earDetected, setEarDetected] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [assetLoadingProgress, setAssetLoadingProgress] = useState(0);
    const [videoReady, setVideoReady] = useState(false);

    // Multi-step scan state
    const [scanStep, setScanStep] = useState<'forward' | 'blink' | 'left' | 'right' | 'done'>('forward');
    const [stepSuccess, setStepSuccess] = useState({ forward: false, blink: false, left: false, right: false });
    const [stepConfidence, setStepConfidence] = useState({ forward: 0, blink: 0, left: 0, right: 0 });
    const [stepProgress, setStepProgress] = useState(0);

    // Store captured features for each step
    const faceFeatureRef = useRef<number[] | null>(null);
    const earLeftFeatureRef = useRef<number[] | null>(null);
    const earRightFeatureRef = useRef<number[] | null>(null);
    const stepSuccessRef = useRef(stepSuccess);

    // Load MediaPipe libraries dynamically with retry
    const loadMediaPipeLibraries = useCallback(async (retryCount = 0) => {
        try {
            console.log(`[BiometricScanner] Loading MediaPipe libraries... (attempt ${retryCount + 1})`);

            if (!faceMeshModuleRef.current) {
                console.log('[BiometricScanner] Loading FaceMesh...');
                try {
                    // Try different import methods
                    let faceMeshModule;
                    try {
                        faceMeshModule = await import('@mediapipe/face_mesh');
                    } catch (e) {
                        console.log('[BiometricScanner] Trying alternative import...');
                        faceMeshModule = await import('@mediapipe/face_mesh/face_mesh.js');
                    }

                    console.log('[BiometricScanner] FaceMesh module keys:', Object.keys(faceMeshModule));
                    console.log('[BiometricScanner] FaceMesh available:', !!faceMeshModule.FaceMesh);
                    console.log('[BiometricScanner] FaceMesh default:', !!faceMeshModule.default);

                    // Try to get FaceMesh from different possible locations
                    let FaceMesh = faceMeshModule.FaceMesh || faceMeshModule.default?.FaceMesh || faceMeshModule.default;

                    // If still undefined, try loading from CDN
                    if (!FaceMesh || typeof FaceMesh !== 'function') {
                        console.log('[BiometricScanner] FaceMesh not found in module, trying CDN approach...');
                        try {
                            // Load from CDN as fallback
                            const script = document.createElement('script');
                            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js';
                            script.type = 'module';
                            document.head.appendChild(script);

                            // Wait for script to load
                            await new Promise((resolve, reject) => {
                                script.onload = resolve;
                                script.onerror = reject;
                                setTimeout(() => reject(new Error('CDN load timeout')), 10000);
                            });

                            // Try to access from global scope
                            FaceMesh = (window as any).FaceMesh;
                            console.log('[BiometricScanner] CDN FaceMesh:', typeof FaceMesh);
                        } catch (cdnError) {
                            console.error('[BiometricScanner] CDN fallback failed:', cdnError);
                        }
                    }

                    console.log('[BiometricScanner] Resolved FaceMesh:', typeof FaceMesh);

                    faceMeshModuleRef.current = {
                        ...faceMeshModule,
                        FaceMesh: FaceMesh
                    };
                } catch (error) {
                    console.error('[BiometricScanner] FaceMesh import failed:', error);
                    throw error;
                }
            }

            if (!drawingUtilsModuleRef.current) {
                console.log('[BiometricScanner] Loading drawing utils...');
                const drawingUtilsModule = await import('@mediapipe/drawing_utils');
                console.log('[BiometricScanner] Drawing utils module keys:', Object.keys(drawingUtilsModule));

                const drawConnectors = drawingUtilsModule.drawConnectors || drawingUtilsModule.default?.drawConnectors || drawingUtilsModule.default;
                drawingUtilsModuleRef.current = {
                    ...drawingUtilsModule,
                    drawConnectors: drawConnectors
                };
            }

            if (!cameraUtilsModuleRef.current) {
                console.log('[BiometricScanner] Loading camera utils...');
                const cameraUtilsModule = await import('@mediapipe/camera_utils');
                console.log('[BiometricScanner] Camera utils module keys:', Object.keys(cameraUtilsModule));
                console.log('[BiometricScanner] Camera available:', !!cameraUtilsModule.Camera);
                console.log('[BiometricScanner] Camera default:', !!cameraUtilsModule.default);
                
                // Try to get Camera from different possible locations
                let Camera = cameraUtilsModule.Camera || cameraUtilsModule.default?.Camera || cameraUtilsModule.default;
                
                // If Camera is an object, try to get the constructor
                if (Camera && typeof Camera === 'object' && Camera.Camera) {
                    Camera = Camera.Camera;
                }
                
                // If still not a function, try CDN fallback
                if (!Camera || typeof Camera !== 'function') {
                    console.log('[BiometricScanner] Camera not found in module, trying CDN approach...');
                    try {
                        // Load from CDN as fallback
                        const script = document.createElement('script');
                        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1627447222/camera_utils.js';
                        script.type = 'module';
                        document.head.appendChild(script);
                        
                        // Wait for script to load
                        await new Promise((resolve, reject) => {
                            script.onload = resolve;
                            script.onerror = reject;
                            setTimeout(() => reject(new Error('CDN load timeout')), 10000);
                        });
                        
                        // Try to access from global scope
                        Camera = (window as any).Camera;
                        console.log('[BiometricScanner] CDN Camera:', typeof Camera);
                    } catch (cdnError) {
                        console.error('[BiometricScanner] CDN fallback failed:', cdnError);
                    }
                }
                
                console.log('[BiometricScanner] Resolved Camera:', typeof Camera);
                
                cameraUtilsModuleRef.current = {
                    ...cameraUtilsModule,
                    Camera: Camera
                };
            }

            // Wait a bit for modules to fully initialize
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify all libraries are loaded
            const FaceMesh = faceMeshModuleRef.current?.FaceMesh;
            const Camera = cameraUtilsModuleRef.current?.Camera;

            console.log('[BiometricScanner] FaceMesh type:', typeof FaceMesh);
            console.log('[BiometricScanner] Camera type:', typeof Camera);

            if (!FaceMesh || typeof FaceMesh !== 'function') {
                console.error('[BiometricScanner] FaceMesh check failed:', {
                    FaceMesh,
                    type: typeof FaceMesh,
                    module: faceMeshModuleRef.current
                });
                throw new Error('FaceMesh not properly loaded');
            }
            if (!Camera || (typeof Camera !== 'function' && typeof Camera !== 'object')) {
                console.error('[BiometricScanner] Camera check failed:', { 
                    Camera, 
                    type: typeof Camera,
                    module: cameraUtilsModuleRef.current 
                });
                throw new Error('Camera not properly loaded');
            }
            
            // If Camera is an object, it might be a class that needs to be instantiated differently
            if (typeof Camera === 'object' && Camera.Camera && typeof Camera.Camera === 'function') {
                console.log('[BiometricScanner] Using nested Camera constructor');
                Camera = Camera.Camera;
            }

            console.log('[BiometricScanner] All MediaPipe libraries loaded successfully');
            return true;
        } catch (error) {
            console.error('[BiometricScanner] Failed to load MediaPipe libraries:', error);

            // Retry up to 3 times
            if (retryCount < 2) {
                console.log(`[BiometricScanner] Retrying in 1 second... (${retryCount + 1}/3)`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return loadMediaPipeLibraries(retryCount + 1);
            }

            return false;
        }
    }, []);

    useEffect(() => {
        stepSuccessRef.current = stepSuccess;
    }, [stepSuccess]);

    const { toast } = useToast();

    // Network status monitoring
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Always render the video element, even if hidden; set videoReady when playable
    useEffect(() => {
        if (!videoRef.current) return;

        const initializeCamera = async () => {
            try {
                console.log('[BiometricScanner] Requesting camera access...');
                setCurrentStep('initializing');
                setAssetLoadingProgress(10);

                // Check if camera permissions are available
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error('Camera API not supported in this browser');
                }

                setAssetLoadingProgress(20);
                const constraints = {
                    video: {
                        width: { ideal: 640, min: 320 },
                        height: { ideal: 480, min: 240 },
                        facingMode: 'user',
                        frameRate: { ideal: 30, min: 15 }
                    },
                    audio: false
                };

                setAssetLoadingProgress(40);
                console.log('[BiometricScanner] Requesting camera stream...');
                let stream: MediaStream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints as any);
                } catch (err: any) {
                    console.warn('[BiometricScanner] Primary getUserMedia failed, trying fallbacks...', err?.name || err);
                    // Fallback 1: any available camera
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    } catch (err2: any) {
                        // Fallback 2: enumerate devices and pick the first video input
                        const devices = await navigator.mediaDevices.enumerateDevices();
                        const cams = devices.filter((d) => d.kind === 'videoinput');
                        if (cams.length === 0) {
                            throw err2 || err;
                        }
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: { deviceId: { exact: cams[0].deviceId } },
                            audio: false,
                        } as any);
                    }
                }
                streamRef.current = stream;
                console.log('[BiometricScanner] Camera stream obtained successfully');

                setAssetLoadingProgress(60);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;

                    // Use both onloadedmetadata and oncanplay for better compatibility
                    const handleVideoReady = () => {
                        console.log('[BiometricScanner] Video ready to play');
                        setAssetLoadingProgress(80);

                        if (videoRef.current) {
                            videoRef.current.play().then(() => {
                                console.log('[BiometricScanner] Camera stream started successfully');
                                setVideoReady(true);
                                setCurrentStep('detecting');
                                setAssetLoadingProgress(100);
                                setErrorMessage(null);
                                setErrorSuggestion(null);
                            }).catch((error) => {
                                console.error('[BiometricScanner] Video play error:', error);
                                setErrorMessage('Failed to start video playback: ' + error.message);
                                setErrorSuggestion('Try refreshing the page or check browser permissions');
                                setCurrentStep('error');
                            });
                        }
                    };

                    // Set up event listeners
                    videoRef.current.onloadedmetadata = handleVideoReady;
                    videoRef.current.oncanplay = handleVideoReady;

                    // Fallback: if video doesn't load within 5 seconds, show error
                    setTimeout(() => {
                        if (!videoReady && currentStep === 'initializing') {
                            console.warn('[BiometricScanner] Video loading timeout, trying fallback...');
                            if (videoRef.current && videoRef.current.readyState >= 2) {
                                handleVideoReady();
                            }
                        }
                    }, 5000);

                } else {
                    throw new Error('Video element not available after getting camera stream');
                }
            } catch (error: any) {
                console.error('[BiometricScanner] Camera error:', error);
                let errorMsg = 'Camera access failed';
                let suggestion = 'Check camera permissions and try again';

                if (error.name === 'NotAllowedError') {
                    errorMsg = 'Camera permission denied';
                    suggestion = 'Please allow camera access and refresh the page';
                } else if (error.name === 'NotFoundError') {
                    errorMsg = 'No camera found';
                    suggestion = 'Please connect a camera and try again';
                } else if (error.name === 'NotSupportedError') {
                    errorMsg = 'Camera not supported';
                    suggestion = 'Try using a different browser or device';
                } else if (error.message) {
                    errorMsg = 'Camera error: ' + error.message;
                }

                setErrorMessage(errorMsg);
                setErrorSuggestion(suggestion);
                setCurrentStep('error');
                setAssetLoadingProgress(0);
            }
        };

        // Start camera immediately when video element is available
        initializeCamera();

        // Cleanup: stop camera on unmount
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, []); // Remove videoReady dependency to start camera immediately

    // Process scan steps for multi-angle capture and liveness
    const processScanStep = useCallback((landmarks: any[], confidence: number, detected: boolean) => {
        if (!detected) {
            setErrorMessage('No face detected.');
            setErrorSuggestion('Make sure your face is clearly visible and well-lit.');
            return;
        }

        setErrorMessage(null);
        setErrorSuggestion(null);

        const nose = landmarks[1];
        // Eye aspect ratio for blink detection using a few vertical/horizontal distances
        const computeEAR = (lm: any, eyeIndices: number[]) => {
            const p = (i: number) => lm[i];
            const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
            const v1 = dist(p(eyeIndices[1]), p(eyeIndices[5]));
            const v2 = dist(p(eyeIndices[2]), p(eyeIndices[4]));
            const h = dist(p(eyeIndices[0]), p(eyeIndices[3]));
            return (v1 + v2) / (2.0 * h);
        };

        // Landmarks for left/right eyes (MediaPipe indices)
        const leftEye = [33, 159, 145, 133, 153, 144];
        const rightEye = [263, 386, 374, 362, 380, 373];
        const earLeft = computeEAR(landmarks, leftEye);
        const earRight = computeEAR(landmarks, rightEye);
        const blinkDetected = (earLeft + earRight) / 2 < 0.20; // threshold for blink

        if (scanStep === 'forward') {
            setStepConfidence((prev) => ({ ...prev, forward: confidence }));
            if (confidence > 0.7 && !stepSuccess.forward) {
                // Capture face features facing forward
                faceFeatureRef.current = extractFaceFeatureVector(landmarks);
                setStepSuccess((prev) => ({ ...prev, forward: true }));
                setScanStep('blink');
                setStepProgress(25);
                speak('Face detected. Please blink once.');
            }
        } else if (scanStep === 'blink') {
            setStepConfidence((prev) => ({ ...prev, blink: blinkDetected ? 1 : 0 }));
            if (blinkDetected && !stepSuccess.blink) {
                setStepSuccess((prev) => ({ ...prev, blink: true }));
                setScanStep('left');
                setStepProgress(50);
                speak('Thank you. Now turn your head to the left.');
            }
        } else if (scanStep === 'left') {
            setStepConfidence((prev) => ({ ...prev, left: confidence }));
            if (nose && nose.x < 0.35 && confidence > 0.65 && !stepSuccess.left) {
                // Capture left-side ear/face features
                earLeftFeatureRef.current = extractEarSideFeatureVector(landmarks, 'left');
                setStepSuccess((prev) => ({ ...prev, left: true }));
                setScanStep('right');
                setStepProgress(75);
                speak('Left side captured. Now turn your head to the right.');
            }
        } else if (scanStep === 'right') {
            setStepConfidence((prev) => ({ ...prev, right: confidence }));
            if (nose && nose.x > 0.65 && confidence > 0.65 && !stepSuccess.right) {
                // Capture right-side ear/face features
                earRightFeatureRef.current = extractEarSideFeatureVector(landmarks, 'right');
                setStepSuccess((prev) => ({ ...prev, right: true }));
                setScanStep('done');
                setStepProgress(100);
                speak('Right side captured. Scan complete.');
                setTimeout(() => {
                    completeScan();
                }, 600);
            }
        }
    }, [scanStep, stepSuccess]);

    // Handle FaceMesh results
    const handleFaceMeshResults = useCallback((results: any) => {
        if (!canvasRef.current || !videoRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Prepare canvas size to match video
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let detected = false;
        let confidence = 0;

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];

            // Calculate confidence based on number of landmarks returned
            const validCount = landmarks.length;
            confidence = Math.min(1, validCount / 468);
            setDetectionConfidence(confidence * 100);
            detected = validCount > 260; // speed: accept earlier when many points exist

            // Omit drawing for speed. Uncomment to debug overlays.
            // const drawConnectors = drawingUtilsModuleRef.current?.drawConnectors;
            // const FACEMESH_TESSELATION = faceMeshModuleRef.current?.FACEMESH_TESSELATION;
            // if (drawConnectors && FACEMESH_TESSELATION) {
            //     drawConnectors(ctx as any, landmarks, FACEMESH_TESSELATION as any, { color: detected ? '#00ff00' : '#ff0000', lineWidth: 0.5 });
            // }

            // Process scan steps and liveness
            processScanStep(landmarks, confidence, detected);
        } else {
            setDetectionConfidence(0);
            detected = false;
        }

        setFaceDetected(detected);
    }, [processScanStep]);
    const initializeFaceMesh = useCallback(async () => {
        // Prevent multiple initializations
        if (faceMeshRef.current) {
            console.log('[BiometricScanner] FaceMesh already initialized, skipping...');
            return;
        }

        try {
            console.log('[BiometricScanner] Initializing FaceMesh...');
            setAssetLoadingProgress(50);

            // Load MediaPipe libraries first
            const librariesLoaded = await loadMediaPipeLibraries();
            if (!librariesLoaded) {
                throw new Error('Failed to load MediaPipe libraries. Please check your internet connection.');
            }

            setAssetLoadingProgress(70);

            // Get FaceMesh from loaded module
            const FaceMesh = faceMeshModuleRef.current?.FaceMesh;
            const FACEMESH_TESSELATION = faceMeshModuleRef.current?.FACEMESH_TESSELATION;

            // Check if FaceMesh is available and is a constructor function
            if (!FaceMesh || typeof FaceMesh !== 'function') {
                console.error('[BiometricScanner] FaceMesh check failed:', { FaceMesh, type: typeof FaceMesh });
                throw new Error('FaceMesh is not available. Please check your internet connection and refresh the page.');
            }

            console.log('[BiometricScanner] Creating FaceMesh instance...');
            const faceMesh = new FaceMesh({
                // Use CDN so you don't need to host WASM/assets locally
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
            });

            faceMesh.setOptions({
                selfMode: false,
                selfieMode: true,
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7,
                modelComplexity: 1,
            } as any);

            faceMesh.onResults((results: any) => {
                handleFaceMeshResults(results);
            });

            faceMeshRef.current = faceMesh;
            setAssetLoadingProgress(90);
            setCurrentStep('detecting');
            setErrorMessage(null);
            setErrorSuggestion(null);
            console.log('[BiometricScanner] FaceMesh initialized successfully');
        } catch (error: any) {
            console.error('[BiometricScanner] Failed to initialize FaceMesh:', error);
            setErrorMessage('Failed to initialize FaceMesh: ' + (error.message || 'Unknown error'));
            setErrorSuggestion('Check your internet connection, or try refreshing the page.');
            setCurrentStep('error');
            throw error;
        }
    }, [handleFaceMeshResults, loadMediaPipeLibraries]);



    // Complete the scan and send data
    const completeScan = useCallback(() => {
        const avg = (stepConfidence.forward + stepConfidence.blink + stepConfidence.left + stepConfidence.right) / 4;
        const faceVec = faceFeatureRef.current || [];
        const leftVec = earLeftFeatureRef.current || [];
        const rightVec = earRightFeatureRef.current || [];
        const mergedEar = mergeEarVectors(leftVec, rightVec);

        const biometricData: BiometricData = {
            faceFeatures: faceVec,
            earFeatures: mergedEar,
            earLeftFeatures: leftVec,
            earRightFeatures: rightVec,
            confidence: Math.max(0.5, Math.min(0.99, avg)),
            timestamp: new Date().toISOString(),
            verification_type: scanType === 'both' ? 'both' : scanType
        };

        setCurrentStep('complete');
        onScanComplete(biometricData);
    }, [stepConfidence, scanType, onScanComplete]);

    // Extract a stable face feature vector from landmarks by normalizing coordinates and sampling
    const extractFaceFeatureVector = (landmarks: any[]): number[] => {
        const box = getBoundingBox(landmarks);
        const coords: number[] = [];
        const step = Math.max(1, Math.floor(landmarks.length / 64));
        for (let i = 0; i < landmarks.length && coords.length < 128; i += step) {
            const p = landmarks[i];
            const nx = (p.x - box.x) / (box.width || 1);
            const ny = (p.y - box.y) / (box.height || 1);
            coords.push(nx, ny);
        }
        // Pad to 128 dims if needed
        while (coords.length < 128) coords.push(0);
        return coords.slice(0, 128);
    };

    // Extract side-ear feature vector by focusing on lateral landmarks
    const extractEarSideFeatureVector = (landmarks: any[], side: 'left' | 'right'): number[] => {
        const indices = side === 'left'
            ? [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377].filter((i) => i < landmarks.length)
            : [454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 151].filter((i) => i < landmarks.length);
        const box = getBoundingBox(landmarks);
        const vec: number[] = [];
        indices.forEach((i) => {
            const p = landmarks[i];
            const nx = (p.x - box.x) / (box.width || 1);
            const ny = (p.y - box.y) / (box.height || 1);
            vec.push(nx, ny);
        });
        while (vec.length < 64) vec.push(0);
        return vec.slice(0, 64);
    };

    const mergeEarVectors = (left: number[], right: number[]): number[] => {
        const size = Math.max(left.length, right.length);
        const out: number[] = [];
        for (let i = 0; i < size; i++) {
            const a = left[i] ?? 0;
            const b = right[i] ?? 0;
            out.push((a + b) / 2);
        }
        return out.slice(0, 64);
    };

    // Start biometric scanning process
    const startBiometricScan = useCallback(async () => {
        if (!videoReady) {
            toast({
                title: 'Camera Not Ready',
                description: 'Please wait for camera to initialize',
                variant: 'destructive'
            });
            return;
        }

        if (!navigator.onLine) {
            setErrorMessage('No internet connection.');
            setErrorSuggestion('Please check your network and try again.');
            return;
        }

        setIsScanning(true);
        setAttempts(0);
        setErrorMessage(null);
        setErrorSuggestion(null);
        setScanProgress(0);
        setScanStep('forward');
        setStepSuccess({ forward: false, blink: false, left: false, right: false });
        setStepConfidence({ forward: 0, blink: 0, left: 0, right: 0 });

        if (videoRef.current && faceMeshRef.current) {
            // Get Camera from loaded module
            let Camera = cameraUtilsModuleRef.current?.Camera;
            
            // Handle object case - get the actual constructor
            if (Camera && typeof Camera === 'object' && Camera.Camera && typeof Camera.Camera === 'function') {
                Camera = Camera.Camera;
            }
            
            // Use MediaPipe Camera helper to feed frames to FaceMesh
            if (!Camera || typeof Camera !== 'function') {
                console.error('[BiometricScanner] Camera not available:', { Camera, type: typeof Camera });
                throw new Error('Camera class not available. Please refresh the page.');
            }
            
            console.log('[BiometricScanner] Creating Camera instance...');
            const cam = new Camera(videoRef.current, {
                onFrame: async () => {
                    if (faceMeshRef.current && videoRef.current) {
                        await faceMeshRef.current.send({ image: videoRef.current });
                        // Update progress based on steps success (use ref to avoid stale closure)
                        const s = stepSuccessRef.current;
                        const p = (s.forward ? 25 : 0) + (s.blink ? 25 : 0) + (s.left ? 25 : 0) + (s.right ? 25 : 0);
                        setScanProgress(p);
                        setEarDetected(s.left || s.right);
                    }
                },
                width: 640,
                height: 480,
            });
            cameraRef.current = cam;
            cam.start();
            speak('Look straight at the camera.');
        }

        // Timeout safety
        setTimeout(() => {
            if (isScanning && scanStep !== 'done') {
                setErrorMessage('Scan timeout. Please try again.');
                setCurrentStep('error');
                setIsScanning(false);
                if (cameraRef.current) cameraRef.current.stop();
            }
        }, 20000);
    }, [videoReady, scanType, toast, isScanning, scanStep, stepSuccess]);

    // Complete biometric scan (stop camera and finalize)
    const completeBiometricScan = useCallback(() => {
        if (cameraRef.current) cameraRef.current.stop();
        setIsScanning(false);
        setCurrentStep('complete');
        speak('Biometric scan complete. Thank you.');
    }, []);

    // Reset scanner
    const resetScanner = useCallback(() => {
        setIsScanning(false);
        setScanProgress(0);
        setCurrentStep('detecting');
        setAttempts(0);
        setFaceDetected(false);
        setEarDetected(false);
        setErrorMessage(null);
        setErrorSuggestion(null);
        setDetectionConfidence(0);
    }, []);

    // Voice prompt helper
    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
        }
    };

    // Get bounding box for landmarks
    const getBoundingBox = (landmarks: any[]) => {
        if (!landmarks || landmarks.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        landmarks.forEach((point: any) => {
            if (point.x < minX) minX = point.x;
            if (point.x > maxX) maxX = point.x;
            if (point.y < minY) minY = point.y;
            if (point.y > maxY) maxY = point.y;
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    };

    // Start scanning process (simplified - camera is already initialized)
    const startScanning = useCallback(async () => {
        try {
            console.log('[BiometricScanner] Starting scan process...');
            setCurrentStep('detecting');
            setAttempts(prev => prev + 1);

            // Check network connectivity
            if (!isOnline) {
                throw new Error('No internet connection. Please check your network and try again.');
            }

            // Camera is already initialized, just start the biometric scan
            if (videoReady && faceMeshRef.current) {
                await startBiometricScan();
            } else {
                throw new Error('Camera or FaceMesh not ready. Please wait and try again.');
            }

        } catch (error) {
            console.error('Error starting scan:', error);
            setCurrentStep('error');
            onError(error instanceof Error ? error.message : 'Failed to start scanning');
        }
    }, [onError, isOnline, videoReady, startBiometricScan]);

    // Stop scanning
    const stopScanning = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }

        if (faceMeshRef.current) {
            faceMeshRef.current.close();
            faceMeshRef.current = null;
        }

        setIsScanning(false);
        setCurrentStep('initializing');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Initialize biometric detection only once when video is ready
    useEffect(() => {
        if (videoReady && !faceMeshRef.current) {
            // Add timeout to prevent infinite loading
            const timeout = setTimeout(() => {
                if (!faceMeshRef.current) {
                    console.warn('[BiometricScanner] FaceMesh initialization timeout');
                    setErrorMessage('Biometric scanner initialization timeout');
                    setErrorSuggestion('Please refresh the page and try again');
                    setCurrentStep('error');
                }
            }, 10000); // 10 second timeout

            initializeFaceMesh().catch(error => {
                console.error('Failed to initialize FaceMesh:', error);
                setErrorMessage('Failed to initialize biometric scanner');
                setErrorSuggestion('Please refresh the page and try again');
                setCurrentStep('error');
            }).finally(() => {
                clearTimeout(timeout);
            });
        }
    }, [videoReady, initializeFaceMesh]);

    // Only start scanning after videoRef.current is set
    useEffect(() => {
        if (videoRef.current && attempts < maxAttempts && !isScanning) {
            // Don't auto-start scanning, let user control it
            setCurrentStep('detecting');
        }
        // eslint-disable-next-line
    }, [videoRef.current, attempts, maxAttempts, isScanning]);

    // Render the main scanner content
    const renderScanContent = () => {
        if (currentStep === 'error') {
            return (
                <div className="text-center">
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                        <h3 className="text-lg font-semibold text-red-700 mb-2">Camera Error</h3>
                        <p className="text-red-600 mb-2">{errorMessage}</p>
                        {errorSuggestion && (
                            <p className="text-red-500 text-sm mb-3">{errorSuggestion}</p>
                        )}
                    </div>
                    <div className="flex justify-center gap-2">
                        <Button onClick={resetScanner} variant="outline">Try Again</Button>
                        <Button onClick={() => window.location.reload()}>Refresh Page</Button>
                    </div>
                </div>
            );
        }

        if (currentStep === 'complete') {
            return (
                <div className="text-center">
                    <div className="mb-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <h3 className="text-lg font-semibold text-green-700 mb-2">Scan Complete!</h3>
                        <p className="text-green-600">Biometric data captured successfully</p>
                        <p className="text-sm text-green-500 mt-1">Confidence: {detectionConfidence.toFixed(1)}%</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {/* Camera Preview */}
                <div className="relative w-full h-64 bg-gray-900 rounded-lg overflow-hidden">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        autoPlay
                        muted
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ pointerEvents: 'none' }}
                    />

                    {/* Loading Overlay */}
                    {!videoReady && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                            <div className="text-center text-white">
                                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                                <p className="text-sm">Initializing Camera...</p>
                                <div className="mt-2 w-32 h-2 bg-gray-600 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                        style={{ width: `${assetLoadingProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs mt-1">{assetLoadingProgress}%</p>
                            </div>
                        </div>
                    )}

                    {/* Detection Overlay */}
                    {videoReady && (faceDetected || earDetected) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-32 h-32 border-4 border-green-500 rounded-full animate-pulse"></div>
                        </div>
                    )}
                </div>

                {/* Status Information */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span>Face</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${earDetected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span>Ear</span>
                        </div>
                    </div>

                    {currentStep === 'detecting' && videoReady && (
                        <p className="text-blue-600 font-medium">
                            Camera ready! Click "Start Scan" to begin biometric capture
                        </p>
                    )}
                </div>

                {/* Scan Controls */}
                {videoReady && (
                    <div className="flex justify-center gap-2">
                        {!isScanning ? (
                            <Button
                                onClick={startBiometricScan}
                                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                                disabled={!videoReady}
                            >
                                Start {scanType === 'face' ? 'Face' : scanType === 'ear' ? 'Ear' : 'Biometric'} Scan
                            </Button>
                        ) : (
                            <div className="w-full space-y-3">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${scanProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-sm text-gray-600 text-center">
                                    Scanning... {scanProgress}%
                                </p>
                                <Button
                                    onClick={resetScanner}
                                    variant="outline"
                                    className="w-full"
                                >
                                    Cancel Scan
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Network Status */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    {isOnline ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                </div>
            </div>
        );
    };

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                    <CameraIcon className="h-6 w-6" />
                    Real-Time Biometric Scanner
                </CardTitle>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <span>
                        {scanType === 'face' && 'Face Recognition'}
                        {scanType === 'ear' && 'Ear Biometric'}
                        {scanType === 'both' && 'Dual Biometric (Face + Ear)'}
                    </span>
                    <Badge>
                        {mode === 'registration' ? 'Registration' : 'Verification'}
                    </Badge>
                </div>
                {!isOnline && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                        <div className="flex items-center gap-2">
                            <WifiOff className="h-4 w-4" />
                            <span>Offline mode - limited functionality</span>
                        </div>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {renderScanContent()}
            </CardContent>
        </Card>
    );
};

export default RealTimeBiometricScanner;
