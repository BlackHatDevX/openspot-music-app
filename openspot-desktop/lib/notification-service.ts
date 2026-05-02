import * as Notifications from "expo-notifications";
import { Track } from "@/types/music";

const MEDIA_NOTIFICATION_ID = "media-notification";
const MEDIA_CATEGORY_ID = "media-controls";
const MEDIA_CHANNEL_ID = "media-controls";

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
  private static currentTrackId: string | number | null = null;
  private static initialized = false;
  private static initPromise: Promise<boolean> | null = null;
  private static lastSignature: string | null = null;

  private static getTrackSignature(track: Track, isPlaying: boolean): string {
    return `${track.id}|${track.title}|${track.artist}|${isPlaying ? "1" : "0"}`;
  }

  static async showOrUpdateMediaNotification(track: Track, isPlaying: boolean) {
    try {
      if (!track?.id) return;

      if (!this.initialized) {
        const ok = await this.initialize();
        if (!ok) return;
      }

      const nextSignature = this.getTrackSignature(track, isPlaying);
      if (this.lastSignature === nextSignature) {
        return;
      }

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
          categoryIdentifier: MEDIA_CATEGORY_ID,
          sound: false,
          sticky: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(process.env.EXPO_OS === "android" ? { channelId: MEDIA_CHANNEL_ID } : {}),
        },
        trigger: null,
      });
      this.currentTrackId = track.id;
      this.lastSignature = nextSignature;
    } catch (error) {
      console.error("Failed to show/update media notification:", error);
    }
  }

  static async hideMediaNotification() {
    try {
      await Notifications.dismissNotificationAsync(MEDIA_NOTIFICATION_ID);
      await Notifications.cancelScheduledNotificationAsync(MEDIA_NOTIFICATION_ID).catch(() => {});
      this.currentTrackId = null;
      this.lastSignature = null;
    } catch (error) {
      console.error("Failed to hide media notification:", error);
    }
  }

  static async setupNotificationCategories() {
    try {
      await Notifications.setNotificationCategoryAsync(MEDIA_CATEGORY_ID, [
        {
          identifier: "previous",
          buttonTitle: "Prev",
          options: { opensAppToForeground: true },
        },
        {
          identifier: "play_pause",
          buttonTitle: "Play/Pause",
          options: { opensAppToForeground: true },
        },
        {
          identifier: "next",
          buttonTitle: "Next",
          options: { opensAppToForeground: true },
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
      await Notifications.setNotificationChannelAsync(MEDIA_CHANNEL_ID, {
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
    if (this.initialized) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const hasPermission = await this.requestPermissions();
        if (!hasPermission) return false;

        await this.setupNotificationCategories();
        await this.createNotificationChannel();

        this.initialized = true;
        return true;
      } catch (error) {
        console.error("Failed to initialize notification service:", error);
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }
}