import { DomainEvent } from './events.js';

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void> | void;

export interface IEventBus {
  publish<T extends DomainEvent>(event: T): Promise<void>;
  subscribe<T extends DomainEvent>(eventName: T['name'], handler: EventHandler<T>): void;
  unsubscribe<T extends DomainEvent>(eventName: T['name'], handler: EventHandler<T>): void;
  clearHandlers(): void;
}

export class DomainEventBus implements IEventBus {
  private handlers = new Map<string, EventHandler<any>[]>();

  async publish<T extends DomainEvent>(event: T): Promise<void> {
    const list = this.handlers.get(event.name) || [];
    for (const handler of list) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`Error handling event ${event.name}:`, err);
      }
    }
  }

  subscribe<T extends DomainEvent>(eventName: T['name'], handler: EventHandler<T>): void {
    const list = this.handlers.get(eventName) || [];
    list.push(handler);
    this.handlers.set(eventName, list);
  }

  unsubscribe<T extends DomainEvent>(eventName: T['name'], handler: EventHandler<T>): void {
    const list = this.handlers.get(eventName) || [];
    this.handlers.set(
      eventName,
      list.filter((h) => h !== handler)
    );
  }

  clearHandlers(): void {
    this.handlers.clear();
  }
}

export const domainEventBus: IEventBus = new DomainEventBus();
