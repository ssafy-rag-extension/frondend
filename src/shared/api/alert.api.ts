import { springApi } from '@/shared/lib/apiInstance';
import type { ApiEnvelope } from '@/shared/lib/api.types';

import type { GetAlertRequest, AlertResponse } from '@/shared/types/alert.types';

export function fetchNotifications(params: GetAlertRequest) {
  return springApi.get<ApiEnvelope<AlertResponse>>('/notifications', { params });
}

export function markNotificationAsRead(notificationNo: string) {
  return springApi.patch<ApiEnvelope<void>>(`/notifications/${notificationNo}/read`);
}

export function deleteNotification(notificationNo: string) {
  return springApi.delete<ApiEnvelope<void>>(`/notifications/${notificationNo}`);
}
