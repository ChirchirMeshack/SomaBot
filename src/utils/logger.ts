import { createLogger, format, transports } from 'winston';
import path from 'path';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf((info) => `${info.timestamp} [${info.level}]: ${info.message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join('logs', 'app.log') })
  ]
});

export default logger; 