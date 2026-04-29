# Changelog

## OpenSpot v3.1.0 (Android - React Native)

* **Offline Mode**: Supports offline playback with search and filter functionality.
* **Player Optimization**: Improved performance and responsiveness.
* **Turkish Translations**: Added Turkish language support.
* **Region-Based Trending**: Toggle for region-specific trending songs.
* **Notification Controls**: Fixed notification control issues.
* **Player Layout**: Improved layout for tablets and Android car systems.
* **Update System**: Introduced an advanced update system with in-app changelogs.
* **Repeat-One Option**: Added repeat-one option for better playback control.
* **YouTube API**: Integration is now in beta phase.


---

## OpenSpot v3.0.0 (Android - React Native)

### New Features

* **UI**: Fully revamped UI for a cleaner and smoother experience.
* **Playback Controls**: Improved notification controls with headset and lockscreen support.
* **Mini Player**: Capsule-style mini player support on compatible devices (OnePlus, etc).

### Improvements

* **YouTube API**: More stable streaming and better reliability.
* **Player**: General playback improvements and smoother performance.

### Fixes

* Fixed theming issues.
* Fixed incorrect track duration.
* Fixed background playback issues on some devices.
* Fixed player-related bugs.
* Fixed artist songs not loading completely (pagination improved).


### Changes

* Removed repeat option from queue.

<br/>
<br/>
<br/>

---

## OpenSpot v2.0.5 

### New Features

* **i18n**: Supports 8 languages (de, en, es, fr, he, hi, ru, zh).
* **API**: Supports Savan API and YouTube API.
* **Search**: Users can now search public playlists, albums, and artists (Savan API only).
* **UI**: Revamped UI with a new welcome screen and settings screen.
* **Theme**: Dark mode, light mode, and auto mode supported.



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

