export enum ScanStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum Severity {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  INFO = 'Info',
}

export interface Vulnerability {
  id: string;
  name: string;
  severity: Severity;
  description: string;
  remediation: string;
}

export interface ScanResult {
  target: string;
  timestamp: string;
  logs: string[];
  analysis?: {
    summary: string;
    vulnerabilities: Vulnerability[];
    securityScore: number;
  };
}

export interface ScanConfig {
  target: string;
  ports: string; // e.g., "80,443,8080"
  modules: {
    portScan: boolean;
    whois: boolean;
    bannerGrab: boolean;
    vulnCheck: boolean;
  };
  threads: number;
}
