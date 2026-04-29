/**
 * Face ID: face-api.js orqali yuz descriptor olish va modellarni yuklash.
 * Modellar CDN dan yuklanadi (lokal public/models shart emas).
 */

import * as faceapi from "face-api.js";

const MODELS_CDN = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights";
let modelsLoaded = false;

export async function loadFaceApiModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_CDN),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_CDN),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_CDN),
    ]);
    modelsLoaded = true;
    return true;
  } catch (e) {
    console.error("Face API models load error:", e);
    return false;
  }
}

/**
 * Rasm elementidan yuz descriptorini olish (128 o'lchamli).
 */
export async function getDescriptorFromImage(
  input: HTMLImageElement | HTMLCanvasElement | string
): Promise<number[] | null> {
  const ok = await loadFaceApiModels();
  if (!ok) return null;

  let img: HTMLImageElement | HTMLCanvasElement;
  if (typeof input === "string") {
    img = await createImage(input);
  } else {
    img = input;
  }

  const detection = await faceapi
    .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
    .run();

  if (!detection?.descriptor) return null;
  return Array.from(detection.descriptor);
}

function createImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Video kadridan yuz descriptorini olish (kamera uchun).
 */
export async function getDescriptorFromVideo(video: HTMLVideoElement): Promise<number[] | null> {
  const ok = await loadFaceApiModels();
  if (!ok) return null;

  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor()
    .run();

  if (!detection?.descriptor) return null;
  return Array.from(detection.descriptor);
}
