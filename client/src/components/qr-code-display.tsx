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
    if (!asset) return code;

    const employeeLines: string[] = [];
    if (asset.assignedTo) employeeLines.push(`Name: ${asset.assignedTo}`);
    if (asset.employeeId) employeeLines.push(`ID No.: ${asset.employeeId}`);
    if (asset.position) employeeLines.push(`Position: ${asset.position}`);
    if (asset.department) employeeLines.push(`Department: ${asset.department}`);
    if (asset.company) employeeLines.push(`Company: ${asset.company}`);
    if (asset.location) employeeLines.push(`Location: ${asset.location}`);

    const deviceLines: string[] = [
      `Asset/Tag Number: ${asset.deviceCode}`,
      `Item Description: ${asset.name}`,
      `Brand/Model: ${asset.brand} / ${asset.model}`,
      `Serial Number: ${asset.serialNumber}`,
    ];
    if (asset.specifications) deviceLines.push(`Device Specs: ${asset.specifications}`);
    if (asset.notes) deviceLines.push(`Remarks: ${asset.notes}`);

    const sections: string[] = [];
    if (employeeLines.length > 0) {
      sections.push('EMPLOYEE INFORMATION');
      sections.push(...employeeLines);
      sections.push('');
    }
    sections.push('DEVICE INFORMATION');
    sections.push(...deviceLines);

    return sections.join('\n');
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
          link.download = `QR-${code}.png`;
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
