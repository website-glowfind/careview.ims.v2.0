import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  deviceCode: string;
  assetId?: string;
  size?: number;
  showDownload?: boolean;
  showLabel?: boolean;
  className?: string;
}

export function QRCodeDisplay({
  deviceCode,
  assetId,
  size = 128,
  showDownload = true,
  showLabel = true,
  className = ''
}: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate the URL that the QR code will encode
  // When scanned, it will open the asset details page
  const getQRCodeValue = () => {
    const baseUrl = window.location.origin;
    // Encode the device code in the URL - this can be used to look up the asset
    return `${baseUrl}/asset/${encodeURIComponent(deviceCode)}`;
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

    img.onload = () => {
      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the QR code
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `QR-${deviceCode}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
        }
      }, 'image/png');
      
      URL.revokeObjectURL(url);
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
