export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  timestamp?: string;
}

type ToastListener = (toasts: ToastMessage[]) => void;

class ToastManager {
  private toasts: ToastMessage[] = [];
  private listeners: Set<ToastListener> = new Set();

  public subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  public show(toastData: Omit<ToastMessage, 'id'>): string {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const timeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jayapura',
    }) + ' WIT';

    const newToast: ToastMessage = {
      id,
      duration: toastData.duration ?? 4500,
      timestamp: timeStr,
      ...toastData,
    };

    // Keep max 5 visible toasts
    this.toasts = [newToast, ...this.toasts].slice(0, 5);
    this.notify();

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, newToast.duration);
    }

    return id;
  }

  public success(title: string, description?: string, duration = 4500) {
    return this.show({ title, description, type: 'success', duration });
  }

  public error(title: string, description?: string, duration = 5000) {
    return this.show({ title, description, type: 'error', duration });
  }

  public warning(title: string, description?: string, duration = 4500) {
    return this.show({ title, description, type: 'warning', duration });
  }

  public info(title: string, description?: string, duration = 4000) {
    return this.show({ title, description, type: 'info', duration });
  }

  public remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  public clear() {
    this.toasts = [];
    this.notify();
  }
}

export const toast = new ToastManager();
