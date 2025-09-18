import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaMetrics } from './kafka/kafka.module';
import { RecentActiveBatcher } from './redis/redis.module';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        KafkaMetrics,
        {
          provide: RecentActiveBatcher,
          useValue: {
            metrics: () => ({
              enqueuedTotal: 0,
              flushedTotal: 0,
              flushOkTotal: 0,
              flushFailTotal: 0,
              lastFlushAt: 0,
              lastFlushDurationMs: 0,
              queueLength: 0,
            }),
          },
        },
      ],
    }).compile();

    appController = moduleFixture.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
