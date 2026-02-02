import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../context/LanguageContext';
import { useUnifiedAuth } from '../../../../../src/context/UnifiedAuthContext';
import { apiClient } from '../../../lib/api';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../ui/utils';

interface SplashImageManagerProps {
  isEmbedded?: boolean;
}

export function SplashImageManager({ isEmbedded = false }: SplashImageManagerProps) {
  const { t } = useLanguage();
  const { shopRestaurantId: restaurantId, shopRestaurant } = useUnifiedAuth();
  const [splashImageUrl, setSplashImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (shopRestaurant?.settings) {
      const settings = shopRestaurant.settings as any;
      const url = settings.splashImageUrl || null;
      setSplashImageUrl(url);
      if (url) {
        // Create full URL for preview
        const baseUrl = window.location.origin;
        setPreviewUrl(url.startsWith('http') ? url : `${baseUrl}${url}`);
      }
    }
  }, [shopRestaurant]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('splash_image.invalid_file_type') || 'Invalid file type. Please upload JPEG, PNG, or WebP image.');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(t('splash_image.file_too_large') || 'File size exceeds 5MB limit.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!restaurantId) {
      toast.error(t('splash_image.restaurant_id_required') || 'Restaurant ID is required');
      return;
    }

    const fileInput = document.getElementById('splash-image-input') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) {
      toast.error(t('splash_image.file_required') || 'Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await apiClient.uploadSplashImage(restaurantId, file);
      if (result.success && result.data?.splashImageUrl) {
        const url = result.data.splashImageUrl;
        setSplashImageUrl(url);
        const baseUrl = window.location.origin;
        setPreviewUrl(url.startsWith('http') ? url : `${baseUrl}${url}`);
        toast.success(t('splash_image.upload_success') || 'Splash image uploaded successfully');
        // Reset file input
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        throw new Error(result.error?.message || 'Upload failed');
      }
    } catch (error: unknown) {
      console.error('Error uploading splash image:', error);
      const errorMessage = error instanceof Error ? error.message : t('splash_image.upload_failed') || 'Failed to upload splash image';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!restaurantId) {
      toast.error(t('splash_image.restaurant_id_required') || 'Restaurant ID is required');
      return;
    }

    if (!confirm(t('splash_image.confirm_delete') || 'Are you sure you want to delete the splash image?')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.deleteSplashImage(restaurantId);
      if (result.success) {
        setSplashImageUrl(null);
        setPreviewUrl(null);
        toast.success(t('splash_image.delete_success') || 'Splash image deleted successfully');
        // Reset file input
        const fileInput = document.getElementById('splash-image-input') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        throw new Error(result.error?.message || 'Delete failed');
      }
    } catch (error: unknown) {
      console.error('Error deleting splash image:', error);
      const errorMessage = error instanceof Error ? error.message : t('splash_image.delete_failed') || 'Failed to delete splash image';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const Content = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Current Image Card */}
          {previewUrl && splashImageUrl && (
            <Card className="bg-white border border-zinc-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">{t('splash_image.current_image') || 'Current Image'}</CardTitle>
                <CardDescription>
                  {t('splash_image.current_image_desc') || 'This image is displayed when customers open the app.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full">
                  <div className="relative aspect-video bg-muted rounded-2xl overflow-hidden border border-zinc-200">
                    <img
                      src={previewUrl}
                      alt="Splash image preview"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setPreviewUrl(null);
                        toast.error(t('splash_image.image_load_error') || 'Failed to load image');
                      }}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-3 right-3 shadow-md"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('splash_image.delete') || 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Card */}
          <Card className="bg-white border border-zinc-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t('splash_image.select_image') || 'Select Image'}</CardTitle>
              <CardDescription>
                {t('splash_image.description') || 'Upload an image to be displayed as the splash screen when customers open the app.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Button */}
              <div className="flex items-center gap-3">
                <label htmlFor="splash-image-input" className="cursor-pointer">
                  <input
                    id="splash-image-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button type="button" variant="outline" className="gap-2" asChild>
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      {t('splash_image.choose_file') || 'Choose File'}
                    </span>
                  </Button>
                </label>
                {previewUrl && !splashImageUrl && (
                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t('splash_image.uploading') || 'Uploading...'}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {t('splash_image.upload') || 'Upload'}
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('splash_image.file_info') || 'JPEG, PNG, WebP (max 5MB)'}
              </p>

              {/* Preview before upload */}
              {previewUrl && !splashImageUrl && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('splash_image.preview') || 'Preview'}</Label>
                  <div className="relative w-full">
                    <div className="relative aspect-video bg-muted rounded-2xl overflow-hidden border border-zinc-200">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-3 right-3 bg-white/90 hover:bg-white shadow-md"
                        onClick={() => {
                          setPreviewUrl(null);
                          const fileInput = document.getElementById('splash-image-input') as HTMLInputElement;
                          if (fileInput) {
                            fileInput.value = '';
                          }
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!previewUrl && !splashImageUrl && (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                  <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                    <ImageIcon className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-900 mb-1">
                    {t('splash_image.no_image') || 'No splash image uploaded'}
                  </p>
                  <p className="text-xs text-zinc-500 text-center max-w-xs">
                    {t('splash_image.upload_hint') || 'Upload an image to customize the customer app splash screen'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );

  return Content;
}
