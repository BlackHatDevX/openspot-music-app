## iOS Installation for Openspot

The iOS build is distributed as an **unsigned IPA**, which must be sideloaded using third-party tools.

---

### Recommended: SideStore

SideStore is the recommended sideloading tool.

- [SideStore Website](https://sidestore.io/)
- [SideStore Documentation](https://docs.sidestore.io/)

**Steps:**

1. Install SideStore.
2. Complete the initial pairing (requires a computer, one-time setup).
3. Add OpenSpot by pasting the `apps.json` URL into SideStore sources.
4. Install the app directly from SideStore.

---

### apps.json Feed

Add the following source URL to SideStore (or other compatible tools):

```text
https://raw.githubusercontent.com/BlackHatDevX/openspot-music-app/main/apps.json
```

**Benefits:**

- Direct installation
- Easy updates
- No manual IPA downloads

---

### Alternative: AltStore

**Steps for AltStore:**

1. Install [AltStore](https://altstore.io/) on your device.
2. Download the latest IPA from the [releases page](https://github.com/BlackHatDevX/openspot-music-app/releases/latest).
3. Open AltStore, go to **My Apps**, then tap the **+** button.
4. Select the downloaded IPA and install.

---

### Notes

> **Note:** With a free Apple ID, apps expire after **7 days** and must be refreshed. Initial setup may require a computer. These limitations are due to Apple's sideloading restrictions.

---

<div align="center">

**This iOS installation guide is maintained by [@CesarGarza55](https://github.com/CesarGarza55).**  
**Contributions and improvements are handled by them.**

</div>
