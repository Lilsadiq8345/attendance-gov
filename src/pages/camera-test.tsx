import React, { useRef, useEffect, useState } from 'react';

const CameraTest: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
                setLoading(false);
            } catch (err: any) {
                setError(err.message || 'Camera error');
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div style={{ maxWidth: 400, margin: '2rem auto', textAlign: 'center' }}>
            <h2>Minimal Camera Test</h2>
            {loading && <p>Loading camera...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            <video ref={videoRef} width={360} height={270} autoPlay playsInline style={{ border: '1px solid #ccc', borderRadius: 8, marginTop: 16 }} />
            <p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
                If you see your camera feed above, your browser and camera are working.<br />
                If not, check camera permissions or try a different browser/device.
            </p>
        </div>
    );
};

export default CameraTest; 