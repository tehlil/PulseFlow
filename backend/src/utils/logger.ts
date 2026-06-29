import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  config.NODE_ENV === 'development' ? winston.format.colorize() : winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    if (stack) {
      return `[${timestamp}] ${level}: ${message}\nStack: ${stack}`;
    }
    return `[${timestamp}] ${level}: ${message}${metaString}`;
  })
);

export const logger = winston.createLogger({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    config.NODE_ENV === 'development' ? winston.format.colorize() : winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: config.NODE_ENV === 'development' 
        ? winston.format.combine(winston.format.colorize(), winston.format.simple())
        : winston.format.json(),
    }),
  ],
});
