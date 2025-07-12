import { readFileSync } from 'fs';
import { join } from 'path';
import { ProxyAgent } from 'undici';

export type ProxyType = 'http' | 'https' | 'socks4' | 'socks5';

export interface ProxyConfig {
  type: ProxyType;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

class ProxyManager {
  private proxies: ProxyConfig[] = [];
  private initialized = false;

  private initializeProxies() {
    if (this.initialized) return;
    
    try {
      const proxiesFilePath = join(process.cwd(), 'proxies.txt');
      const proxiesContent = readFileSync(proxiesFilePath, 'utf-8');
      
      this.proxies = proxiesContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => this.parseProxyLine(line.trim()))
        .filter((proxy): proxy is ProxyConfig => proxy !== null);
      
      console.log(`📡 Loaded ${this.proxies.length} valid proxies`);
      if (this.proxies.length > 0) {
        const typeCount = this.proxies.reduce((acc, proxy) => {
          acc[proxy.type] = (acc[proxy.type] || 0) + 1;
          return acc;
        }, {} as Record<ProxyType, number>);
        console.log(`📊 Proxy types: ${JSON.stringify(typeCount)}`);
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load proxies:', error);
      this.proxies = [];
      this.initialized = true;
    }
  }

  private parseProxyLine(line: string): ProxyConfig | null {
    try {
      // Support multiple formats:
      // 1. protocol://host:port
      // 2. protocol://username:password@host:port
      // 3. host:port:username:password (legacy format, defaults to http)
      // 4. host:port (no auth, defaults to http)
      // 5. type://host:port (no auth)
      
      // Check if it's a URL format (protocol://...)
      if (line.includes('://')) {
        return this.parseUrlFormat(line);
      }
      
      // Legacy colon-separated format
      return this.parseColonFormat(line);
    } catch (error) {
      console.warn(`⚠️ Failed to parse proxy line: ${line}`, error);
      return null;
    }
  }

  private parseUrlFormat(line: string): ProxyConfig | null {
    try {
      const url = new URL(line);
      const type = this.normalizeProxyType(url.protocol.slice(0, -1)); // Remove trailing ':'
      
      if (!type) {
        console.warn(`⚠️ Unsupported proxy protocol: ${url.protocol}`);
        return null;
      }

      return {
        type,
        host: url.hostname,
        port: parseInt(url.port) || this.getDefaultPort(type),
        username: url.username || undefined,
        password: url.password || undefined
      };
    } catch (error) {
      console.warn(`⚠️ Invalid URL format: ${line}`);
      return null;
    }
  }

  private parseColonFormat(line: string): ProxyConfig | null {
    const parts = line.split(':');
    
    if (parts.length < 2) {
      return null;
    }

    const host = parts[0];
    const port = parseInt(parts[1]);

    if (!host || isNaN(port)) {
      return null;
    }

    // host:port format (no auth)
    if (parts.length === 2) {
      return {
        type: 'http',
        host,
        port
      };
    }

    // host:port:username:password format
    if (parts.length === 4) {
      return {
        type: 'http',
        host,
        port,
        username: parts[2],
        password: parts[3]
      };
    }

    return null;
  }

  private normalizeProxyType(protocol: string): ProxyType | null {
    const normalized = protocol.toLowerCase();
    switch (normalized) {
      case 'http':
      case 'https':
        return normalized as ProxyType;
      case 'socks':
      case 'socks5':
        return 'socks5';
      case 'socks4':
        return 'socks4';
      default:
        return null;
    }
  }

  private getDefaultPort(type: ProxyType): number {
    switch (type) {
      case 'http':
        return 8080;
      case 'https':
        return 8443;
      case 'socks4':
      case 'socks5':
        return 1080;
      default:
        return 8080;
    }
  }

  getRandomProxy(): ProxyConfig | null {
    this.initializeProxies();
    
    if (this.proxies.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * this.proxies.length);
    return this.proxies[randomIndex];
  }

  getProxyUrl(proxy: ProxyConfig): string {
    const auth = proxy.username && proxy.password 
      ? `${proxy.username}:${proxy.password}@` 
      : '';
    
    return `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;
  }

  // Create fetch options with proxy configuration
  createProxyFetchOptions(options: RequestInit = {}): RequestInit {
    const proxy = this.getRandomProxy();
    
    if (!proxy) {
      console.warn('⚠️ No valid proxy available, making direct request');
      return options;
    }

    const authInfo = proxy.username ? ` (auth: ${proxy.username})` : ' (no auth)';
    console.log(`🔄 Using ${proxy.type.toUpperCase()} proxy: ${proxy.host}:${proxy.port}${authInfo}`);
    
    // Create proxy agent based on type
    const proxyAgent = this.createProxyAgent(proxy);
    
    if (!proxyAgent) {
      console.warn('⚠️ Failed to create proxy agent, making direct request');
      return options;
    }
    
    return {
      ...options,
      // @ts-expect-error - dispatcher is valid for undici but not in standard fetch types
      dispatcher: proxyAgent
    };
  }

  private createProxyAgent(proxy: ProxyConfig) {
    try {
      const proxyUrl = this.getProxyUrl(proxy);
      
      return new ProxyAgent({
        uri: proxyUrl,
        requestTls: {
          rejectUnauthorized: false
        },
        // Additional options for different proxy types
        ...(proxy.type.startsWith('socks') && {
          // SOCKS specific options if needed
        })
      });
    } catch (error) {
      console.warn(`⚠️ Failed to create proxy agent for ${proxy.type}://${proxy.host}:${proxy.port}:`, error);
      return null;
    }
  }

  // Get proxy statistics
  getProxyStats() {
    this.initializeProxies();
    return {
      total: this.proxies.length,
      byType: this.proxies.reduce((acc, proxy) => {
        acc[proxy.type] = (acc[proxy.type] || 0) + 1;
        return acc;
      }, {} as Record<ProxyType, number>),
      withAuth: this.proxies.filter(p => p.username && p.password).length,
      withoutAuth: this.proxies.filter(p => !p.username || !p.password).length
    };
  }
}

export const proxyManager = new ProxyManager(); 