import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';
import type { ITAsset } from '@/types/inventory';

interface QRCodeDisplayProps {
  asset?: ITAsset;
  deviceCode?: string;
  size?: number;
  showDownload?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function QRCodeDisplay({
  asset,
  deviceCode,
  size = 128,
  showDownload = true,
  showLabel = true,
  className = ''
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const code = asset?.deviceCode ?? deviceCode ?? '';

  const getQRCodeValue = () => {
    const dc = asset?.deviceCode ?? code;
    if (!dc) return code;
    // Encode a short link to the public asset-view page. Keeps the QR simple
    // (low density) while scanning reveals the full details.
    //   VITE_PUBLIC_QR_BASE = your public app URL (e.g. https://app.onrender.com)
    //   -> QR is scannable from ANY network.
    //   If unset, falls back to the current address (LAN-only).
    const publicBase = ((import.meta.env.VITE_PUBLIC_QR_BASE as string) || '').replace(/\/+$/, '');
    const base = publicBase || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/asset/${encodeURIComponent(dc)}`;
  };

  // Download QR code as PNG
  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (higher resolution for better quality)
    const scaleFactor = 4;
    canvas.width = size * scaleFactor;
    canvas.height = size * scaleFactor;

    // Create an image from the SVG
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const exportPng = () => {
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `QR-${code}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
        }
      }, 'image/png');
      URL.revokeObjectURL(url);
    };

    img.onload = () => {
      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the QR code
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      exportPng();
    };

    img.src = url;
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="w-4 h-4 text-gray-600" />
          <label className="text-sm font-semibold text-gray-700">
            Asset QR Code
          </label>
        </div>
      )}
      
      <div 
        ref={qrRef}
        className="bg-white p-3 rounded-lg border-2 border-gray-300 shadow-sm"
        title="Scan QR code to view asset details"
      >
        <QRCodeSVG
          value={getQRCodeValue()}
          size={size}
          level="H"
          includeMargin={false}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>

      <div className="mt-2 text-center">
        <p className="text-xs text-gray-600 mb-2">
          Scan to view asset details
        </p>
        
        {showDownload && (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download QR Code
          </button>
        )}
      </div>
    </div>
  );
}
