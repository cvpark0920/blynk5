import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../i18n/LanguageContext';
import { getTranslation } from '../i18n/translations';

interface ErrorPageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ title, message, onRetry }) => {
  const { lang } = useLanguage();

  const defaultTitle = lang === 'ko' 
    ? '오류가 발생했습니다' 
    : lang === 'vn' 
    ? 'Đã xảy ra lỗi'
    : 'An error occurred';

  const defaultMessage = lang === 'ko'
    ? '잠시 후 다시 시도해주세요.'
    : lang === 'vn'
    ? 'Vui lòng thử lại sau.'
    : 'Please try again later.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {title || defaultTitle}
        </h1>
        <p className="text-gray-600 mb-6">
          {message || defaultMessage}
        </p>
        {onRetry && (
          <Button onClick={onRetry} className="bg-blue-600 hover:bg-blue-700">
            {lang === 'ko' ? '다시 시도' : lang === 'vn' ? 'Thử lại' : 'Retry'}
          </Button>
        )}
      </div>
    </div>
  );
};
