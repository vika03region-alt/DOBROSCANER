import { ScanConfig } from "../types";

const COMMON_PORTS = [
  { port: 21, service: 'ftp', version: 'vsftpd 3.0.3' },
  { port: 22, service: 'ssh', version: 'OpenSSH 8.2p1' },
  { port: 23, service: 'telnet', version: 'Linux telnetd' },
  { port: 25, service: 'smtp', version: 'Postfix smtpd' },
  { port: 53, service: 'domain', version: 'ISC BIND 9.11' },
  { port: 80, service: 'http', version: 'Apache/2.4.41 (Ubuntu)' },
  { port: 110, service: 'pop3', version: 'Dovecot pop3d' },
  { port: 143, service: 'imap', version: 'Dovecot imapd' },
  { port: 443, service: 'https', version: 'nginx/1.18.0' },
  { port: 3306, service: 'mysql', version: 'MySQL 5.7.33' },
  { port: 3389, service: 'ms-wbt-server', version: 'Microsoft Terminal Services' },
  { port: 5432, service: 'postgresql', version: 'PostgreSQL 13.3' },
  { port: 6379, service: 'redis', version: 'Redis 6.0.9' },
  { port: 8080, service: 'http-proxy', version: 'Jetty 9.4.31' },
];

const VULNERABILITIES = [
  "[CRITICAL] SQL Injection detected in parameter 'id' at /products.php",
  "[CRITICAL] Remote Code Execution (RCE) via Log4j payload",
  "[HIGH] XSS (Reflected) found in search bar query",
  "[HIGH] Directory Traversal vulnerability in /api/files",
  "[MEDIUM] Weak SSL/TLS Cipher Suites enabled (RC4, 3DES)",
  "[MEDIUM] Missing Security Headers: X-Frame-Options, CSP",
  "[LOW] Server info leaked in HTTP Response Banner",
  "[LOW] Cookie missing 'HttpOnly' and 'Secure' flags",
];

export class ScanSimulation {
  private config: ScanConfig;

  constructor(config: ScanConfig) {
    this.config = config;
  }

  private isPortAllowed(port: number): boolean {
    const portConfig = this.config.ports.trim();
    if (!portConfig) return true; // Default to all if empty

    const parts = portConfig.split(',');
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && port >= start && port <= end) return true;
      } else {
        const p = Number(part);
        if (!isNaN(p) && p === port) return true;
      }
    }
    return false;
  }
  
  private generateFakeIP(): string {
      return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  generateLogs(): string[] {
    const target = this.config.target || 'localhost';
    const steps: string[] = [];
    
    // Determine if input is IP or Domain
    const isIP = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(target);
    const resolvedIP = isIP ? target : this.generateFakeIP();

    // Initialization
    steps.push(`[INFO] Starting LWSCAN v2.4.0-pro`);
    steps.push(`[INFO] Loaded configuration: Threads=${this.config.threads}, Timeout=5000ms`);
    
    if (!isIP) {
        steps.push(`[DNS] Resolving target ${target}...`);
        steps.push(`[DNS] Resolved: ${target} -> ${resolvedIP}`);
    } else {
        steps.push(`[INFO] Target is IP address: ${target}`);
    }
    
    steps.push(`[INFO] Initiating connection checks...`);
    steps.push(`[INFO] Host is UP (Latency: ${Math.floor(Math.random() * 40) + 10}ms)`);

    // Port Scan Module
    if (this.config.modules.portScan) {
      steps.push(`[SCAN] Initiating SYN Stealth Scan on ${target} (Ports: ${this.config.ports || 'All'})...`);
      
      // Filter common ports based on user input AND random chance
      const potentialPorts = COMMON_PORTS.filter(p => this.isPortAllowed(p.port));
      // Increase probability of open ports for demonstration
      const openPorts = potentialPorts.filter(() => Math.random() > 0.5); 
      
      if (openPorts.length === 0) {
        steps.push(`[SCAN] No open ports found in specified range.`);
      } else {
        openPorts.forEach(p => {
          steps.push(`[PORT] Discovered open port ${p.port}/tcp on ${resolvedIP}`);
        });
        
        // Service Detection
        if (this.config.modules.bannerGrab) {
           steps.push(`[INFO] Service detection initiated...`);
           openPorts.forEach(p => {
             steps.push(`[SERV] Port ${p.port}: ${p.service} - ${p.version}`);
             if (Math.random() > 0.8) {
               steps.push(`[WARN] Port ${p.port}: Version ${p.version} has known CVEs.`);
             }
           });
        }
      }
    }

    // WHOIS Module
    if (this.config.modules.whois) {
      steps.push(`[INFO] Querying WHOIS database...`);
      steps.push(`[DATA] Domain: ${target.toUpperCase()}`);
      steps.push(`[DATA] Registrar: GODADDY.COM, LLC`);
      steps.push(`[DATA] Updated Date: 2023-11-15`);
    }

    // Vulnerability Check Module
    if (this.config.modules.vulnCheck) {
      steps.push(`[VULN] Starting script engine (NSE based)...`);
      steps.push(`[VULN] Loading 42 scripts for detected services...`);
      
      const findings = VULNERABILITIES.filter(() => Math.random() > 0.6);
      
      if (findings.length === 0) {
        steps.push(`[INFO] No critical vulnerabilities found in default scripts.`);
        steps.push(`[WARN] Manual verification recommended.`);
      } else {
        findings.forEach(vuln => {
          steps.push(vuln);
        });
      }
    }

    steps.push(`[INFO] Cleaning up temporary files...`);
    steps.push(`[INFO] Scan completed successfully.`);
    
    return steps;
  }
}