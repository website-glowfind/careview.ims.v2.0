import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';
import type { ITAsset } from '@/types/inventory';
import { getCompanyLogo } from '@/utils/device-code';

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

  // Center logo (company brand) — makes the QR look "designed" like the sample.
  const logo = asset?.company ? getCompanyLogo(asset.company) : undefined;
  const logoSize = Math.round(size * 0.24);

  const getQRCodeValue = () => {
    const dc = asset?.deviceCode ?? code;
    if (!dc) return code;
    // Encode a short link to the public asset-view page. Keeps the QR simple
    // (low density) while scanning reveals the full details served by the app.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/asset/${encodeURIComponent(dc)}`;
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

      // Draw the center logo on top (same-origin image, so canvas stays untainted)
      if (logo) {
        const lImg = new Image();
        lImg.onload = () => {
          const ls = canvas.width * 0.24;
          const lx = (canvas.width - ls) / 2;
          const ly = (canvas.height - ls) / 2;
          const pad = ls * 0.12;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(lx - pad, ly - pad, ls + pad * 2, ls + pad * 2);
          ctx.drawImage(lImg, lx, ly, ls, ls);
          exportPng();
        };
        lImg.onerror = exportPng;
        lImg.src = logo;
      } else {
        exportPng();
      }
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
          imageSettings={logo ? { src: logo, height: logoSize, width: logoSize, excavate: true } : undefined}
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
