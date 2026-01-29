const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const registerShopServiceWorker = async () => {
  return navigator.serviceWorker.register('/sw.js', { scope: '/' });
};

export const getExistingSubscription = async () => {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
};

export const subscribeToPush = async (publicKey: string) => {
  // Service Worker 등록 시도
  let registration;
  try {
    registration = await registerShopServiceWorker();
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw new Error('Service Worker 등록에 실패했습니다. 페이지를 새로고침해주세요.');
  }

  // Service Worker가 준비될 때까지 대기 (타임아웃 추가)
  try {
    registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Service Worker 준비 시간 초과')), 10000)
      )
    ]) as ServiceWorkerRegistration;
  } catch (error) {
    console.error('Service Worker ready failed:', error);
    throw new Error('Service Worker 준비에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  // Push Manager가 사용 가능한지 확인
  if (!registration.pushManager) {
    throw new Error('Push 알림 서비스가 사용 불가능합니다.');
  }

  // 기존 구독이 있는지 확인
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) {
    // 기존 구독이 있으면 재사용
    return existingSubscription;
  }

  // 새 구독 생성
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    return subscription;
  } catch (error: any) {
    // AbortError나 push service not available 에러는 조용히 처리 (콘솔 에러 대신 경고만)
    if (error.name === 'AbortError' || error.message?.includes('push service not available')) {
      console.warn('Web Push 서비스가 사용 불가능합니다. 알림음만 활성화됩니다.');
      throw new Error('Push 알림 서비스가 사용 불가능합니다. 브라우저 설정을 확인해주세요.');
    }
    // 다른 에러는 콘솔에 표시
    console.error('Push subscription failed:', error);
    throw error;
  }
};

export const unsubscribeFromPush = async () => {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return null;
  }
  await subscription.unsubscribe();
  return subscription;
};
