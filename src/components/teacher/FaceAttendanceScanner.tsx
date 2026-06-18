import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Scan, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { loadFaceApiModels, getDescriptorFromVideo } from "@/lib/faceApi";

interface FaceAttendanceScannerProps {
  classId: string;
  className?: string;
  onSuccess?: (studentName: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const FaceAttendanceScanner: React.FC<FaceAttendanceScannerProps> = ({
  classId,
  className,
  onSuccess,
}) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<{ type: "success" | "error"; message: string; name?: string } | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<"idle" | "detecting" | "no-face" | "active">("idle");

  // Load models on mount
  useEffect(() => {
    const init = async () => {
      const ok = await loadFaceApiModels();
      setIsModelsLoaded(ok);
    };
    void init();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setScanResult(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      setIsCameraOn(true);
      setDetectionStatus("active");
    } catch (err) {
      toast({
        title: "Kamera xatosi",
        description: "Kameraga ruxsat berilmagan yoki kamera topilmadi.",
        variant: "destructive",
      });
    }
  };

  // Assign stream to video when it's rendered
  useEffect(() => {
    if (isCameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOn]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOn(false);
    setDetectionStatus("idle");
  };

  const handleScan = async () => {
    if (!videoRef.current || !classId || isProcessing) return;

    setIsProcessing(true);
    setScanResult(null);

    try {
      const descriptor = await getDescriptorFromVideo(videoRef.current);
      
      if (!descriptor) {
        setScanResult({ type: "error", message: "Yuz aniqlanmadi. Iltimos, kameraga to'g'ri qarang." });
        setIsProcessing(false);
        return;
      }

      const token = localStorage.getItem("auth_token");
      const res = await fetch(`${API_BASE_URL}/api/teacher/attendance/face`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ descriptor, classId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScanResult({ type: "error", message: data.message || "Davomatni belgilashda xatolik." });
      } else {
        setScanResult({ 
          type: "success", 
          message: `${data.studentName} davomatga qo'yildi!`,
          name: data.studentName 
        });
        if (onSuccess) onSuccess(data.studentName);
        
        // Auto stop camera after success after 3 seconds
        setTimeout(() => {
          setScanResult(null);
        }, 3000);
      }
    } catch (err) {
      setScanResult({ type: "error", message: "Tizimda xatolik yuz berdi." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="overflow-hidden border-2 border-primary/10 shadow-xl">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" />
              Face ID Davomat
            </CardTitle>
            <CardDescription>
              {className ? `${className} sinfi uchun` : "O'quvchi yuzini skanerlang"}
            </CardDescription>
          </div>
          {isModelsLoaded ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Tizim tayyor
            </Badge>
          ) : (
            <Badge variant="outline" className="animate-pulse">
              Modellar yuklanmoqda...
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative aspect-video bg-black flex items-center justify-center group">
          {/* Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-500 ${isCameraOn ? "opacity-100" : "opacity-0"}`}
          />

          {/* Scanning Overlay */}
          <AnimatePresence>
            {isCameraOn && !scanResult && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              >
                {/* Corner Accents */}
                <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />

                {/* Animated Scanning Line */}
                <motion.div 
                  animate={{ top: ["20%", "80%", "20%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute left-10 right-10 h-0.5 bg-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.5)] z-10"
                />
                
                {/* Face Finder Circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-2 border-dashed border-primary/30 rounded-full animate-[spin_10s_linear_infinity]" />
                  <div className="absolute w-56 h-56 border-2 border-primary/20 rounded-full" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* placeholder when camera is off */}
          {!isCameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-4 bg-slate-900">
              <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Camera className="h-10 w-10" />
              </div>
              <p className="text-sm font-medium">Kamera o'chirilgan</p>
              <Button onClick={startCamera} variant="secondary" size="sm">
                Kamerani yoqish
              </Button>
            </div>
          )}

          {/* Status Indicators */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20"
              >
                <div className="bg-background/90 p-6 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 border border-primary/20">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="font-semibold text-lg animate-pulse">Solishtirilmoqda...</p>
                </div>
              </motion.div>
            )}

            {scanResult && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-6 right-6 z-30"
              >
                <div className={`p-4 rounded-xl shadow-2xl border flex items-center gap-4 ${
                  scanResult.type === "success" 
                    ? "bg-green-500/90 border-green-400 text-white" 
                    : "bg-red-500/90 border-red-400 text-white"
                }`}>
                  {scanResult.type === "success" ? (
                    <CheckCircle2 className="h-8 w-8 shrink-0" />
                  ) : (
                    <AlertCircle className="h-8 w-8 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-lg leading-tight">
                      {scanResult.type === "success" ? "Muvaffaqiyatli!" : "Xatolik!"}
                    </p>
                    <p className="text-sm opacity-90">{scanResult.message}</p>
                  </div>
                  {scanResult.type === "error" && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-white hover:bg-white/20"
                      onClick={() => setScanResult(null)}
                    >
                      Qayta
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-background border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isCameraOn ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {isCameraOn ? "Live Camera" : "Standby"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isCameraOn && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={stopCamera} 
                className="h-9"
              >
                Kamerani yopish
              </Button>
            )}
            <Button
              disabled={!isCameraOn || isProcessing || !isModelsLoaded || !!scanResult}
              onClick={handleScan}
              className="h-9 px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {isProcessing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <User className="mr-2 h-4 w-4" />
              )}
              Skanerlash
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
