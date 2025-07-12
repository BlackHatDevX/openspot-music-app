# OpenSpot 🎶


<p align="center">
 <img width="46" alt="Screenshot 2025-06-21 at 10 12 51 PM" src="https://github.com/user-attachments/assets/05e9128b-3f4f-4103-ae0a-ade4d0e33eb1" />
</p>

<h3 align="center">Your Gateway to Limitless Music.</h3>

<p align="center">
  <strong>Stream and download high-quality music for free, with no ads and no login required.</strong>
  <br />
  <a href="https://openspot-six.vercel.app/" target="_blank"><strong>Live Demo »</strong></a>
</p>

<p align="center">
  <a href="https://github.com/BlackHatDevX/openspot-music-app/stargazers">
    <img src="https://img.shields.io/github/stars/BlackHatDevX/openspot-music-app?style=for-the-badge&color=ffd700" alt="Stars">
  </a>
  <a href="https://github.com/BlackHatDevX/openspot-music-app/network/members">
    <img src="https://img.shields.io/github/forks/BlackHatDevX/openspot-music-app?style=for-the-badge&color=84b4a3" alt="Forks">
  </a>
  <a href="https://github.com/BlackHatDevX/openspot-music-app/issues">
    <img src="https://img.shields.io/github/issues/BlackHatDevX/openspot-music-app?style=for-the-badge&color=f38ba8" alt="Issues">
  </a>
</p>

---

**OpenSpot** is a free and open-source music streaming application designed for a seamless, high-fidelity listening experience. Built with a modern tech stack, it features a beautiful, responsive UI that looks great on any device.

Our goal is to provide a user-centric music platform that is accessible to everyone, everywhere.

## ✨ Screenshot

![WhatsApp Image 2025-06-21 at 21 17 57](https://github.com/user-attachments/assets/187e3465-347d-47d9-abeb-20159d9c53d0)


## ✨ Features

-   **High-Quality Streaming**: Listen to your favorite tracks in the best possible quality.
-   **Direct Downloads**: Save music directly to your device for offline listening.
-   **No Login Required**: Jump right in! No accounts or sign-ups needed.
-   **Like & Collect**: Build your personal collection by liking songs, which are saved to your "Liked Songs" playlist.
-   **Beautiful & Responsive UI**: A clean, modern, and intuitive interface that works flawlessly on desktop, tablets, and mobile.
-   **Persistent Player**: Your queue and playback state are saved, so you can pick up right where you left off after a refresh.
-   **Completely Free & Ad-Free**: Enjoy uninterrupted music without any cost or advertisements.
-   **Advanced Proxy Support**: Built-in proxy rotation system for enhanced reliability and privacy.

## 🔒 Proxy Manager

OpenSpot includes a sophisticated proxy management system that automatically rotates through different proxy servers to ensure reliable access to music streaming services. This feature helps bypass rate limits and provides enhanced privacy.

### 🚀 Quick Setup

1. Create a `proxies.txt` file in your project root
2. Add your proxy configurations (see formats below)
3. The app will automatically load and rotate through your proxies

### 📝 Supported Proxy Formats

The proxy manager supports multiple formats and proxy types:

#### **Format 1: URL Format with Authentication**
```
http://username:password@proxy.example.com:8080
https://username:password@proxy.example.com:8443
socks5://username:password@proxy.example.com:1080
socks4://username:password@proxy.example.com:1080
```

#### **Format 2: URL Format without Authentication**
```
http://proxy.example.com:8080
https://proxy.example.com:8443
socks5://proxy.example.com:1080
socks4://proxy.example.com:1080
```

#### **Format 3: Legacy Format with Authentication**
```
proxy.example.com:8080:username:password
proxy.example.com:3128:username:password
```

#### **Format 4: Simple Format (No Authentication)**
```
proxy.example.com:8080
proxy.example.com:3128
```

### 🔧 Supported Proxy Types

- **HTTP**: Standard HTTP proxies
- **HTTPS**: Secure HTTP proxies
- **SOCKS4**: SOCKS version 4 proxies
- **SOCKS5**: SOCKS version 5 proxies (recommended)

### 📋 Example `proxies.txt` Configuration

```txt
# HTTP proxies with authentication
http://user:pass@proxy1.example.com:8080
https://user:pass@proxy2.example.com:8443

# SOCKS proxies
socks5://user:pass@proxy3.example.com:1080
socks4://proxy4.example.com:1080

# Legacy format (defaults to HTTP)
proxy5.example.com:8080:username:password
proxy6.example.com:3128

# Simple format (no auth)
proxy7.example.com:8080
proxy8.example.com:3128

# Comments and empty lines are ignored
# You can mix different formats in the same file
```

### ⚙️ Features

- **🔄 Automatic Rotation**: Random proxy selection for each request
- **🛡️ Graceful Fallback**: Falls back to direct connection if no proxies work
- **📊 Smart Logging**: Detailed statistics and usage information
- **🔧 Error Handling**: Invalid proxy entries are skipped gracefully
- **🚀 Multi-Protocol**: Supports HTTP, HTTPS, SOCKS4, and SOCKS5
- **🔐 Optional Auth**: Works with and without authentication
- **⚡ Performance**: Optimized request queuing and retry logic

### 🎯 Benefits

- **Enhanced Privacy**: Route requests through different IP addresses
- **Rate Limit Bypass**: Distribute requests across multiple proxies
- **Improved Reliability**: Automatic failover to working proxies
- **Geographic Flexibility**: Access content from different regions
- **No Single Point of Failure**: Multiple proxy fallbacks

### 🔍 Monitoring

The proxy manager provides comprehensive logging:

```bash
📡 Loaded 10 valid proxies
📊 Proxy types: {"http":4,"https":2,"socks5":3,"socks4":1}
🔄 Using SOCKS5 proxy: proxy3.example.com:1080 (auth: username)
⚠️ No valid proxy available, making direct request
```

## 🚀 Live Demo

The app is live and available for testing! Check it out now:

**🔗 [https://openspot-six.vercel.app/](https://openspot-six.vercel.app/)**

## 📲 Desktop & Mobile Apps (Coming Soon!)

We are working hard to bring OpenSpot to all your devices. Native applications will be available soon for:
-   **Android** (`.apk`)
-   **iOS**
-   **Windows** (`.exe`)
-   **macOS** (`.dmg`)
-   **Linux** (`.deb`, `.AppImage`)

*The source code for the main web application will also be released soon.*

## 💻 Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI/Animation**: [Framer Motion](https://www.framer.com/motion/), [Lucide React](https://lucide.dev/)
-   **Proxy Management**: [Undici](https://github.com/nodejs/undici) ProxyAgent
-   **Deployment**: [Vercel](https://vercel.com/)

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/BlackHatDevX/openspot-music-app.git
   cd openspot-music-app
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Configure proxies (optional)**
   ```bash
   # Create proxies.txt file in project root
   touch proxies.txt
   
   # Add your proxy configurations
   echo "http://user:pass@proxy.example.com:8080" >> proxies.txt
   ```

4. **Start the development server**
   ```bash
   yarn dev
   ```

5. **Build for production**
   ```bash
   yarn build
   yarn start
   ```

## 🤝 Contributing & Community

OpenSpot is a opensource project. We welcome all contributions, from bug fixes to feature suggestions. Help us make OpenSpot the best free music platform out there!

Our initial goal is to reach **10 stars and forks**! If you like the project, please consider starring and forking the repository to show your support.

## 🙏 Special Thanks

**OpenSpot is powered by the amazing API provided by dab.yeet.su**

We extend our heartfelt gratitude to the team behind dab.yeet.su for providing the robust music streaming API that makes OpenSpot possible. Their reliable service enables us to deliver high-quality music streaming and search functionality to our users.


## 👤 Author & Contact

**Jash Gro**

-   **LinkedIn**: [https://linkedin.com/in/jash-gro/](https://linkedin.com/in/jash-gro/)
-   **Portfolio**: [https://bit.ly/jashgro](https://bit.ly/jashgro)
-   **Telegram**: [https://telegram.dog/deveIoper_x](https://telegram.dog/deveIoper_x)
-   **GitHub**: [https://github.com/BlackHatDevX](https://github.com/BlackHatDevX)

## 📄 License

This project is open-source and will be licensed under the MIT License. See the `LICENSE` file for more information.
