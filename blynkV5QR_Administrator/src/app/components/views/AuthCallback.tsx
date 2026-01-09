import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUnifiedAuth } from '../../../../src/context/UnifiedAuthContext';

/**
 * AuthCallback 컴포넌트
 * 
 * 참고: 통합 앱에서는 UnifiedAuthContext가 OAuth 콜백을 자동으로 처리합니다.
 * 이 컴포넌트는 호환성을 위해 유지되지만, 실제로는 UnifiedAuthContext의
 * useEffect가 콜백을 처리하므로 이 컴포넌트가 렌더링될 때는 이미 인증이 완료된 상태입니다.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { isAdminAuthenticated } = useUnifiedAuth();

  useEffect(() => {
    // UnifiedAuthContext가 이미 콜백을 처리했으므로,
    // 인증 상태를 확인하고 적절한 페이지로 리다이렉트합니다.
    if (isAdminAuthenticated) {
      navigate('/admin', { replace: true });
    } else {
      // 인증 실패 시 로그인 페이지로 리다이렉트
      navigate('/admin', { replace: true });
    }
  }, [isAdminAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Completing authentication...</p>
      </div>
    </div>
  );
}
