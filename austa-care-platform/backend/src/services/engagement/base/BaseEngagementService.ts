import { EventEmitter } from 'events';

export interface ServiceConfig {
  name: string;
  version: string;
  [key: string]: any;
}

export abstract class BaseEngagementService extends EventEmitter {
  protected config: ServiceConfig;
  protected isInitialized: boolean = false;

  constructor(config: ServiceConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.onInitialize();
    this.isInitialized = true;
    this.emit('initialized', { service: this.config.name });
  }

  protected abstract onInitialize(): Promise<void>;

  getConfig(): ServiceConfig {
    return this.config;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// Repository interface for data access
export interface Repository<T> {
  findOne(options: any): Promise<T | null>;
  find(options?: any): Promise<T[]>;
  save(entity: T): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  count(options?: any): Promise<number>;
}

// Mock repository for services that need it
export class MockRepository<T> implements Repository<T> {
  private data: Map<string, T> = new Map();

  async findOne(options: any): Promise<T | null> {
    const id = options.where?.id || options.id;
    return this.data.get(id) || null;
  }

  async find(options?: any): Promise<T[]> {
    return Array.from(this.data.values());
  }

  async save(entity: T): Promise<T> {
    const id = (entity as any).id || Date.now().toString();
    (entity as any).id = id;
    this.data.set(id, entity);
    return entity;
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    const existing = this.data.get(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }
    const updated = { ...existing, ...entity };
    this.data.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.data.delete(id);
  }

  async count(options?: any): Promise<number> {
    return this.data.size;
  }
}