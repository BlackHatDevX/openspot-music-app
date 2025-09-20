# Changelog

## OpenSpot v2.0.4 (Android & iOS - React Native)

* **New API integrated** → [#32](https://github.com/BlackHatDevX/openspot-music-app/issues/32)
* **Aggressive wakelock implementation** to fix **background app kill issues** on MIUI / HyperOS / other aggressive ROMs → [#30](https://github.com/BlackHatDevX/openspot-music-app/issues/30), [#20](https://github.com/BlackHatDevX/openspot-music-app/issues/20), [#19](https://github.com/BlackHatDevX/openspot-music-app/issues/19)
* **HyperOS navigation bar override issue resolved** → [#28](https://github.com/BlackHatDevX/openspot-music-app/issues/28)
* **Media controls notification (Play/Pause/Next/Previous)** → still in **beta** → [#9](https://github.com/BlackHatDevX/openspot-music-app/issues/9)
* **Downloads list infinite loading bug fixed**

* **iOS** → Tested on iOS 26 simulator via Expo Go. Works fine ([video](https://drive.google.com/file/d/1ArNbQBzgbwpwE0llvHZt1BTHcqbX54N_/view)).
  ⚠️ No Apple Developer Account (\$100/year), so `.ipa` and TestFlight builds are not available. Community help for iOS builds is welcome!





## \[v2.0.3] - 2025-07-26 (Android & iOS only – contributors welcome)

### Added

* **Offline Music Support**: Users can now play downloaded songs without internet access.
* **Custom Playlist Support**: Create, manage, and organize your own playlists.
* **App Update System**: Notifies users of new updates and guides them through the update process.
* **Country-Specific Songs**: App now fetches user location using [ipinfo](https://github.com/ipinfo) to show trending tracks from their region.
* **Trending Songs Integration**: Dynamically fetches trending music from [`trending.json`](https://github.com/BlackHatDevX/trending-music-os). Open for community contributions.

### Changed

* **Player UI Revamped**: Sleeker look with smoother transitions and better media control visibility.

### Fixed

* **Data Consumption Issue**: Playing downloaded songs now fully works offline without consuming mobile data.

### Other

* **Download Section**: A dedicated section to manage all your downloaded songs.
* **Playlist Deletion Shortcut**: Long press a playlist to delete it instantly.



## [v2.0.2] - 2025-01-16

### Added
- **macOS Support**: Full desktop app support for macOS with native window controls and audio management
- **Project Structure**: Added complete Electron desktop app alongside existing React Native mobile app

## [v2.0.1] - 2025-07-15

### Added
- File sharing support using `expo-sharing`, with proper permission handling and bundle identifier updates.

### Changed
- Switched audio backend from `expo-av` to `expo-audio` for improved stability and performance ([reference](https://www.reddit.com/r/reactnative/comments/1lzpqrl/comment/n34j1k8/)).
- Updated app icon.

### Fixed
- Downloading issues on some devices by replacing media library saving with sharing flow.
- Search functionality errors in **TopBar** component resolved.

