import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Set high limit to avoid warning leaks
  }

  publish(event: string, payload: any): void {
    logger.info(`📢 Event Published: ${event}`, { payload });
    this.emit(event, payload);
  }

  subscribe(event: string, handler: (payload: any) => void | Promise<void>): void {
    logger.info(`🔌 Subscriber registered for event: ${event}`);
    
    // Wrap handler to safely catch async listener errors
    const safeHandler = async (payload: any) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error(`❌ Error in event subscriber for event [${event}]:`, error);
      }
    };
    
    this.on(event, safeHandler);
  }
}

export const eventBus = new EventBus();
export default eventBus;
