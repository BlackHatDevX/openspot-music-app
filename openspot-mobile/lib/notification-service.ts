import * as Notifications from "expo-notifications";
import { Track } from "@/types/music";

const MEDIA_NOTIFICATION_ID = "media-notification";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    if (notification.request.content.data?.type === "media") {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    }
    return {
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    };
  },
});

export class NotificationService {
  private static currentTrackId: number | null = null;

  static async showOrUpdateMediaNotification(track: Track, isPlaying: boolean) {
    try {
      await Notifications.dismissNotificationAsync(MEDIA_NOTIFICATION_ID).catch(() => {});
      await Notifications.scheduleNotificationAsync({
        identifier: MEDIA_NOTIFICATION_ID, 
        content: {
          title: track.title,
          body: isPlaying ? `Playing • ${track.artist}` : `Paused • ${track.artist}`,
          data: {
            type: "media",
            trackId: track.id,
            isPlaying,
          },
          categoryIdentifier: "media-controls",
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
      this.currentTrackId = typeof track.id === 'number' ? track.id : Number(track.id);
    } catch (error) {
      console.error("Failed to show/update media notification:", error);
    }
  }

  static async hideMediaNotification() {
    try {
      await Notifications.dismissNotificationAsync(MEDIA_NOTIFICATION_ID);
      this.currentTrackId = null;
    } catch (error) {
      console.error("Failed to hide media notification:", error);
    }
  }

  static async setupNotificationCategories() {
    try {
      await Notifications.setNotificationCategoryAsync("media-controls", [
        {
          identifier: "previous",
          buttonTitle: "Prev",
          options: { opensAppToForeground: false },
        },
        {
          identifier: "play_pause",
          buttonTitle: "Play/Pause",
          options: { opensAppToForeground: false },
        },
        {
          identifier: "next",
          buttonTitle: "Next",
          options: { opensAppToForeground: false },
        },
        {
          identifier: "close",
          buttonTitle: "Close",
          options: { opensAppToForeground: false, isDestructive: true },
        },
      ]);
    } catch (error) {
      console.error("Failed to set up notification categories:", error);
    }
  }

  static async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.warn("Notification permissions not granted");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to request notification permissions:", error);
      return false;
    }
  }

  static async createNotificationChannel() {
    try {
      await Notifications.setNotificationChannelAsync("media-controls", {
        name: "Media Controls",
        description: "Music playback controls",
        importance: Notifications.AndroidImportance.HIGH,
        sound: null,
        vibrationPattern: [0, 150, 150],
        lightColor: "#1DB954",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: false,
        enableLights: true,
        enableVibrate: true,
      });
    } catch (error) {
      console.error("Failed to create notification channel:", error);
    }
  }

  static async initialize() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      await this.setupNotificationCategories();
      await this.createNotificationChannel();

      return true;
    } catch (error) {
      console.error("Failed to initialize notification service:", error);
      return false;
    }
  }
}