import React, { useState } from "react";
import { Camera, CheckCircle2, Upload, User, Loader2, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDescriptorFromImage } from "@/lib/faceApi";
import { useToast } from "@/hooks/use-toast";

interface FaceEnrollmentProps {
  onCapture: (descriptor: number[], imageSrc?: string) => void;
  savedDescriptor?: number[] | null;
}

export const FaceEnrollment: React.FC<FaceEnrollmentProps> = ({ onCapture, savedDescriptor }) => {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCaptured, setIsCaptured] = useState(!!savedDescriptor);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsProcessing(true);
    setIsCaptured(false);

    try {
      // Process image to get face descriptor
      const descriptor = await getDescriptorFromImage(url);
      
      if (!descriptor) {
        toast({
          title: "Yuz aniqlanmadi",
          description: "Rasmda yuz topilmadi. Iltimos, aniqroq rasm yuklang.",
          variant: "destructive",
        });
        setPreviewUrl(null);
      } else {
        // Convert blob to base64 to send to server
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onCapture(descriptor, base64);
        };
        reader.readAsDataURL(file);
        
        setIsCaptured(true);
        toast({
          title: "Muvaffaqiyatli",
          description: "Yuz kodi muvaffaqiyatli olindi.",
        });
      }
    } catch (err) {
      toast({
        title: "Xatolik",
        description: "Rasmni qayta ishlashda xatolik yuz berdi.",
        variant: "destructive",
      });
      setPreviewUrl(null);
    } finally {
      setIsProcessing(false);
      // Clean up URL to avoid memory leaks
      // URL.revokeObjectURL(url); // Don't revoke yet so it shows in preview
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const reset = () => {
    setPreviewUrl(null);
    setIsCaptured(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Face ID Ro'yxatdan o'tkazish
        </label>
        {isCaptured && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Tayyor
          </Badge>
        )}
      </div>

      <div className="relative aspect-video bg-muted rounded-xl border-2 border-dashed border-muted-foreground/20 overflow-hidden flex items-center justify-center group">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          capture="user" 
          className="hidden" 
        />

        {previewUrl ? (
          <div className="relative w-full h-full bg-slate-100 flex items-center justify-center">
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none">
              {isProcessing ? (
                <div className="bg-background/90 p-4 rounded-xl shadow-lg flex items-center gap-3 border border-primary/20">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <span className="text-sm font-medium">Qayta ishlanmoqda...</span>
                </div>
              ) : isCaptured ? (
                <div className="bg-green-500/90 text-white p-2 rounded-full shadow-lg">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              ) : null}
            </div>
            {!isProcessing && (
              <button 
                onClick={reset}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center p-6 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Camera className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">O'quvchi rasmini yuklang</p>
              <p className="text-xs text-muted-foreground">
                Telefondan rasmga olishingiz yoki tayyor rasmni yuklashingiz mumkin
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" type="button" onClick={triggerFileInput}>
                <Upload className="mr-2 h-4 w-4" /> Rasm tanlash
              </Button>
              <Button size="sm" type="button" onClick={triggerFileInput} className="hidden sm:inline-flex">
                <Camera className="mr-2 h-4 w-4" /> Kamera
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
