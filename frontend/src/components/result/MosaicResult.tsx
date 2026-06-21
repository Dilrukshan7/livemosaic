"use client";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Button from "@/components/ui/Button";
import { JobStatusResponse } from "@/types";

interface MosaicResultProps {
  result: JobStatusResponse;
}

export default function MosaicResult({ result }: MosaicResultProps) {
  if (!result.output_url) return null;

  const ext = result.output_format === "PNG" ? "png" : "jpg";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Your Mosaic</h2>
        <a href={result.output_url} download={`mosaicforge-result.${ext}`}>
          <Button size="sm">Download {result.output_format ?? "Image"}</Button>
        </a>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
        <TransformWrapper initialScale={1} minScale={0.5} maxScale={8}>
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                <button
                  onClick={() => zoomIn()}
                  className="bg-white/90 border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium hover:bg-gray-50"
                >+</button>
                <button
                  onClick={() => zoomOut()}
                  className="bg-white/90 border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium hover:bg-gray-50"
                >−</button>
                <button
                  onClick={() => resetTransform()}
                  className="bg-white/90 border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium hover:bg-gray-50"
                >Reset</button>
              </div>
              <TransformComponent wrapperClass="w-full" contentClass="w-full">
                <img
                  src={result.output_url}
                  alt="Mosaic result"
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      <p className="text-xs text-gray-400 text-center">
        This image will be automatically deleted in 10 minutes. Download it now to keep it.
      </p>
    </div>
  );
}
