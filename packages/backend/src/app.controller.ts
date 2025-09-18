import { Controller, Get, Inject, Res } from '@nestjs/common';
import { AppService } from './app.service';
import type { Response } from 'express';
import { KafkaMetrics } from './kafka/kafka.module';
import { RecentActiveBatcher } from './redis/redis.module';
import * as os from 'os';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly kafkaMetrics: KafkaMetrics,
    private readonly recentActive: RecentActiveBatcher,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('metrics')
  async metrics(@Res() res: Response) {
    // Prometheus 文本格式
    const lines: string[] = [];

    // Kafka metrics
    lines.push('# HELP kafka_sent_ok Total number of messages sent successfully');
    lines.push('# TYPE kafka_sent_ok counter');
    lines.push(`kafka_sent_ok ${this.kafkaMetrics.sentOK}`);

    lines.push('# HELP kafka_sent_fail Total number of message send failures');
    lines.push('# TYPE kafka_sent_fail counter');
    lines.push(`kafka_sent_fail ${this.kafkaMetrics.sentFail}`);

    lines.push('# HELP kafka_dlq_count Total number of messages routed to DLQ');
    lines.push('# TYPE kafka_dlq_count counter');
    lines.push(`kafka_dlq_count ${this.kafkaMetrics.dlqCount}`);

    // RecentActiveBatcher metrics
    const r = this.recentActive.metrics();
    lines.push('# HELP recent_active_enqueued_total Items enqueued');
    lines.push('# TYPE recent_active_enqueued_total counter');
    lines.push(`recent_active_enqueued_total ${r.enqueuedTotal}`);

    lines.push('# HELP recent_active_flushed_total Items flushed to redis');
    lines.push('# TYPE recent_active_flushed_total counter');
    lines.push(`recent_active_flushed_total ${r.flushedTotal}`);

    lines.push('# HELP recent_active_flush_ok_total Flush success batches');
    lines.push('# TYPE recent_active_flush_ok_total counter');
    lines.push(`recent_active_flush_ok_total ${r.flushOkTotal}`);

    lines.push('# HELP recent_active_flush_fail_total Flush failed batches');
    lines.push('# TYPE recent_active_flush_fail_total counter');
    lines.push(`recent_active_flush_fail_total ${r.flushFailTotal}`);

    lines.push('# HELP recent_active_last_flush_ts Unix ms of last flush');
    lines.push('# TYPE recent_active_last_flush_ts gauge');
    lines.push(`recent_active_last_flush_ts ${r.lastFlushAt}`);

    lines.push('# HELP recent_active_last_flush_duration_ms Duration of last flush');
    lines.push('# TYPE recent_active_last_flush_duration_ms gauge');
    lines.push(`recent_active_last_flush_duration_ms ${r.lastFlushDurationMs}`);

    lines.push('# HELP recent_active_queue_length Current queue length');
    lines.push('# TYPE recent_active_queue_length gauge');
    lines.push(`recent_active_queue_length ${r.queueLength}`);

    // Node.js runtime & system metrics
    const mem = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());
    const load1 = os.loadavg()[0] || 0;

    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${uptimeSec}`);

    lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${mem.rss}`);

    lines.push('# HELP process_heap_used_bytes V8 heap used bytes');
    lines.push('# TYPE process_heap_used_bytes gauge');
    lines.push(`process_heap_used_bytes ${mem.heapUsed}`);

    lines.push('# HELP process_heap_total_bytes V8 heap total bytes');
    lines.push('# TYPE process_heap_total_bytes gauge');
    lines.push(`process_heap_total_bytes ${mem.heapTotal}`);

    lines.push('# HELP system_load1 1-minute system load average');
    lines.push('# TYPE system_load1 gauge');
    lines.push(`system_load1 ${load1}`);

    const body = lines.join('\n') + '\n';
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(body);
  }
}
