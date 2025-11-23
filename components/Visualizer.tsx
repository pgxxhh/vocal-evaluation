import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ stream, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioCtx = audioContextRef.current;
    analyserRef.current = audioCtx.createAnalyser();
    analyserRef.current.fftSize = 128; 
    
    sourceRef.current = audioCtx.createMediaStreamSource(stream);
    sourceRef.current.connect(analyserRef.current);

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');

    const draw = () => {
      if (!canvasCtx || !analyserRef.current) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Clear canvas
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 1.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i]; // 0 - 255

        // Gradient color: Cyan to Blue
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#06b6d4'); // Cyan 500
        gradient.addColorStop(1, '#3b82f6'); // Blue 500

        canvasCtx.fillStyle = gradient;
        
        // Rounded caps visuals
        const scaledHeight = (barHeight / 255) * canvas.height * 0.8;
        
        const centerY = canvas.height / 2;
        // Draw rounded rect
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, centerY - scaledHeight / 2, barWidth - 2, scaledHeight, 4);
        canvasCtx.fill();

        x += barWidth;
      }
    };

    if (isRecording) {
        draw();
    } else {
        if(canvasCtx) canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
    };
  }, [stream, isRecording]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={120} 
      className="w-full h-32 rounded-lg bg-black/20"
    />
  );
};

export default Visualizer;