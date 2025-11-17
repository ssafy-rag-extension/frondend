// 알림 목록 조회
export type GetAlertRequest = {
  cursor: string;
  limit: string;
};

export type AlertResponse = {
  data: NotificationItem[];
  pagination: NotificationPagination;
};

export type NotificationItem = {
  notificationNo: string;
  category: string;
  eventType: string;
  referenceId: string;
  title: string;
  total: number;
  successCount: number;
  failedCount: number;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPagination = {
  hasNext: boolean;
  nextCursor: string | null;
  count: number;
};
