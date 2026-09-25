export interface RokuConfig {
  ip: string;
  devUser: string;
  devPassword: string;
  ecpPort: number;
  devPort: number;
  logPort: number;
}

export const defaultConfig: RokuConfig = {
  ip: process.env.ROKU_IP || '192.168.4.32',
  devUser: process.env.ROKU_DEV_USER || 'rokudev',
  devPassword: process.env.ROKU_DEV_PASSWORD || 'qqqqaaaa',
  ecpPort: parseInt(process.env.ROKU_ECP_PORT || '8060', 10),
  devPort: parseInt(process.env.ROKU_DEV_PORT || '80', 10),
  logPort: parseInt(process.env.ROKU_LOG_PORT || '8085', 10),
};
