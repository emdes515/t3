import { toast } from 'sonner';

export const playNotificationSound = () => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  audio.volume = 0.2;
  audio.play().catch(e => console.error('Sound play blocked:', e));
};

export const notify = {
  success: (message: string) => {
    toast.success(message);
    playNotificationSound();
  },
  error: (message: string) => {
    toast.error(message);
    playNotificationSound();
  },
  info: (message: string) => {
    toast.info(message);
    playNotificationSound();
  },
  warning: (message: string) => {
    toast.warning(message);
    playNotificationSound();
  },
  promise: <T>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: (data) => {
        playNotificationSound();
        return messages.success;
      },
      error: (err) => {
        playNotificationSound();
        return messages.error;
      },
    });
  }
};
