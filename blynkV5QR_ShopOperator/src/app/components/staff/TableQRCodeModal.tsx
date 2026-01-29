import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { toast } from 'sonner';
import { X, QrCode, Download, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '../ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '../ui/drawer';
import { Button } from '../ui/button';

interface TableQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: number;
  qrCodeUrl: string;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

export function TableQRCodeModal({
  isOpen,
  onClose,
  tableNumber,
  qrCodeUrl,
}: TableQRCodeModalProps) {
  const { t, language } = useLanguage();
  const isDesktop = useIsDesktop();
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate QR code image URL using external API
  useEffect(() => {
    if (isOpen && qrCodeUrl) {
      setIsLoading(true);
      // Use QR Server API to generate QR code image
      const encodedUrl = encodeURIComponent(qrCodeUrl);
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}`;
      setQrImageUrl(qrImageUrl);
      setIsLoading(false);
    } else if (isOpen && !qrCodeUrl) {
      setQrImageUrl(null);
    }
  }, [isOpen, qrCodeUrl]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeUrl);
      setCopied(true);
      toast.success(
        language === 'ko' 
          ? 'QR 코드 URL이 복사되었습니다.' 
          : language === 'vn' 
          ? 'URL mã QR đã được sao chép.' 
          : 'QR code URL copied.'
      );
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast.error(
        language === 'ko' 
          ? 'URL 복사에 실패했습니다.' 
          : language === 'vn' 
          ? 'Không thể sao chép URL.' 
          : 'Failed to copy URL.'
      );
    }
  };

  const handleDownloadQR = async () => {
    if (!qrImageUrl) {
      toast.error(
        language === 'ko' 
          ? 'QR 코드를 불러올 수 없습니다.' 
          : language === 'vn' 
          ? 'Không thể tải mã QR.' 
          : 'Unable to load QR code.'
      );
      return;
    }

    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table-${tableNumber}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(
        language === 'ko' 
          ? 'QR 코드가 다운로드되었습니다.' 
          : language === 'vn' 
          ? 'Mã QR đã được tải xuống.' 
          : 'QR code downloaded.'
      );
    } catch (error) {
      console.error('Failed to download QR code:', error);
      toast.error(
        language === 'ko' 
          ? 'QR 코드 다운로드에 실패했습니다.' 
          : language === 'vn' 
          ? 'Không thể tải mã QR.' 
          : 'Failed to download QR code.'
      );
    }
  };

  const handleOpenLink = () => {
    if (!qrCodeUrl) {
      return;
    }
    window.open(qrCodeUrl, '_blank', 'noopener,noreferrer');
  };

  const content = (
    <div className="flex flex-col gap-6 p-6">
      {/* QR Code Display */}
      <div className="flex flex-col items-center space-y-4">
        {isLoading ? (
          <div className="w-[260px] h-[260px] flex items-center justify-center bg-muted rounded-2xl border border-border shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : qrImageUrl ? (
          <div className="w-[260px] h-[260px] bg-card rounded-2xl p-4 border border-border shadow-sm flex items-center justify-center">
            <img
              src={qrImageUrl}
              alt={`Table ${tableNumber} QR Code`}
              className="w-full h-full object-contain"
              onError={(e) => {
                console.error('QR code image failed to load:', qrImageUrl);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="w-[260px] h-[260px] flex items-center justify-center bg-muted rounded-2xl border border-border shadow-sm">
            <QrCode size={120} className="text-muted-foreground" />
          </div>
        )}

        {/* URL Display */}
        <div className="w-full">
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'ko' ? 'QR 코드 URL:' : language === 'vn' ? 'URL mã QR:' : 'QR Code URL:'}
            </p>
            <p className="text-sm text-foreground break-all font-mono">
              {qrCodeUrl}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={handleCopyUrl}
            variant="outline"
            className="w-full bg-card text-foreground border-border hover:bg-muted"
            disabled={!qrCodeUrl}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                {language === 'ko' ? '복사됨' : language === 'vn' ? 'Đã sao chép' : 'Copied'}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                {language === 'ko' ? 'URL 복사' : language === 'vn' ? 'Sao chép URL' : 'Copy URL'}
              </>
            )}
          </Button>
          <Button
            onClick={handleOpenLink}
            variant="outline"
            className="w-full bg-card text-foreground border-border hover:bg-muted"
            disabled={!qrCodeUrl}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {language === 'ko' ? '링크로 바로가기' : language === 'vn' ? 'Mở liên kết' : 'Open Link'}
          </Button>
          <Button
            onClick={handleDownloadQR}
            variant="default"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!qrImageUrl || isLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            {language === 'ko' ? 'QR 코드 다운로드' : language === 'vn' ? 'Tải mã QR' : 'Download QR Code'}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 bg-background flex flex-col rounded-l-2xl">
          <SheetHeader className="px-6 py-4 text-left border-b border-border">
            <SheetTitle className="text-lg font-semibold">
              {language === 'ko' ? `테이블 ${tableNumber} QR 코드` : language === 'vn' ? `Mã QR bàn ${tableNumber}` : `Table ${tableNumber} QR Code`}
            </SheetTitle>
            <SheetDescription>
              {language === 'ko' 
                ? '고객이 이 QR 코드를 스캔하여 테이블에 접근할 수 있습니다.'
                : language === 'vn'
                ? 'Khách hàng có thể quét mã QR này để truy cập bàn.'
                : 'Customers can scan this QR code to access the table.'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="h-[90vh] bg-background border-0 shadow-none p-0 flex flex-col">
        <DrawerHeader className="px-6 py-4 text-left border-b border-border">
          <DrawerTitle className="text-lg font-semibold">
            {language === 'ko' ? `테이블 ${tableNumber} QR 코드` : language === 'vn' ? `Mã QR bàn ${tableNumber}` : `Table ${tableNumber} QR Code`}
          </DrawerTitle>
          <DrawerDescription>
            {language === 'ko' 
              ? '고객이 이 QR 코드를 스캔하여 테이블에 접근할 수 있습니다.'
              : language === 'vn'
              ? 'Khách hàng có thể quét mã QR này để truy cập bàn.'
              : 'Customers can scan this QR code to access the table.'}
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
