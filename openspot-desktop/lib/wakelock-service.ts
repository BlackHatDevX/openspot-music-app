
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

export class WakelockService {
  private static isActive = false;

  static async activate() {
    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        playsInSilentModeIOS: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        allowsRecordingIOS: false,
      });

      if (!this.isActive) {
        this.isActive = true;
        console.log('[WakelockService] Audio session activated');
      }
    } catch (error) {
      console.error('[WakelockService] Failed to activate:', error);
    }
  }


  static async deactivate() {
    try {
      if (this.isActive) {
        this.isActive = false;
        console.log('[WakelockService] Deactivated');
      }
    } catch (error) {
      console.error('[WakelockService] Failed to deactivate:', error);
    }
  }

  static isWakelockActive(): boolean {
    return this.isActive;
  }

  static async toggle() {
    if (this.isActive) {
      await this.deactivate();
    } else {
      await this.activate();
    }
  }
}