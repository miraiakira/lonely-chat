import { AppService } from './app.service';
import type { Response } from 'express';
import { KafkaMetrics } from './kafka/kafka.module';
import { RecentActiveBatcher } from './redis/redis.module';
export declare class AppController {
    private readonly appService;
    private readonly kafkaMetrics;
    private readonly recentActive;
    constructor(appService: AppService, kafkaMetrics: KafkaMetrics, recentActive: RecentActiveBatcher);
    getHello(): string;
    metrics(res: Response): Promise<void>;
}
