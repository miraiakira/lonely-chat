import { Injectable } from '@nestjs/common';
import * as os from 'os';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Role } from '../auth/entities/role.entity';
import { Permission } from '../auth/entities/permission.entity';
import { KafkaMetrics } from '../kafka/kafka.module';

@Injectable()
export class SystemService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource, private readonly kafkaMetrics: KafkaMetrics) {}

  private toMB(bytes: number) {
    return Math.round((bytes / 1024 / 1024) * 10) / 10;
  }

  async getOverview() {
    const now = new Date();

    // DB ping & counts (best-effort)
    let dbStatus: 'up' | 'down' = 'up';
    let latencyMs = 0;
    let counts: Record<string, number> = {};
    let latestUserUpdatedAt: string | null = null;
    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      latencyMs = Date.now() - start;
      // Try count users if table exists
      const userCountRes = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from(User, 'user')
        .getRawOne<{ count: string }>();
      counts.users = Number(userCountRes?.count ?? 0);

      // Count roles
      const roleCountRes = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from(Role, 'role')
        .getRawOne<{ count: string }>();
      counts.roles = Number(roleCountRes?.count ?? 0);

      // Count permissions
      const permCountRes = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .from(Permission, 'perm')
        .getRawOne<{ count: string }>();
      counts.permissions = Number(permCountRes?.count ?? 0);

      // Today new users
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(startOfDay.getDate() + 1);
      const todayNewUsersRes = await this.dataSource
        .createQueryBuilder(User, 'user')
        .select('COUNT(*)', 'count')
        .where('user.createdAt >= :start AND user.createdAt < :end', {
          start: startOfDay.toISOString(),
          end: endOfDay.toISOString(),
        })
        .getRawOne<{ count: string }>();
      counts.todayNewUsers = Number(todayNewUsersRes?.count ?? 0);

      // Latest user updatedAt
      const latestUserUpdateRes = await this.dataSource
        .createQueryBuilder(User, 'user')
        .select('MAX(user.updatedAt)', 'latest')
        .getRawOne<{ latest: string }>();
      latestUserUpdatedAt = latestUserUpdateRes?.latest ?? null;
    } catch (e) {
      dbStatus = 'down';
    }

    const mem = process.memoryUsage();
    const cpuCount = os.cpus()?.length || 1;
    const load1 = os.loadavg()[0] || 0;
    const loadRatio = Math.min(load1 / cpuCount, 1);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const systemMemUsedRatio = totalMem > 0 ? (totalMem - freeMem) / totalMem : 0;
    const performanceScore = Math.max(
      0,
      Math.min(100, Math.round(100 - (loadRatio * 60 + systemMemUsedRatio * 40)))
    );

    return {
      app: {
        name: process.env.APP_NAME ?? 'Lonely Chat Admin',
        version: process.env.APP_VERSION ?? 'dev',
        env: process.env.NODE_ENV ?? 'development',
      },
      runtime: {
        now: now.toISOString(),
        uptimeSec: Math.floor(process.uptime()),
        node: process.versions.node,
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        memoryMB: {
          rss: this.toMB(mem.rss),
          heapTotal: this.toMB(mem.heapTotal),
          heapUsed: this.toMB(mem.heapUsed),
          external: this.toMB(mem.external || 0),
        },
        loadAvg: os.loadavg(),
        performanceScore,
      },
      db: {
        status: dbStatus,
        latencyMs,
        counts,
        latestTimes: {
          userUpdatedAt: latestUserUpdatedAt,
        },
      },
      kafka: {
        sentOK: this.kafkaMetrics.sentOK,
        sentFail: this.kafkaMetrics.sentFail,
        dlqCount: this.kafkaMetrics.dlqCount,
      },
    } as const;
  }
}