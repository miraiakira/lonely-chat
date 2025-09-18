"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const kafka_module_1 = require("./kafka/kafka.module");
const redis_module_1 = require("./redis/redis.module");
const os = __importStar(require("os"));
let AppController = class AppController {
    appService;
    kafkaMetrics;
    recentActive;
    constructor(appService, kafkaMetrics, recentActive) {
        this.appService = appService;
        this.kafkaMetrics = kafkaMetrics;
        this.recentActive = recentActive;
    }
    getHello() {
        return this.appService.getHello();
    }
    async metrics(res) {
        const lines = [];
        lines.push('# HELP kafka_sent_ok Total number of messages sent successfully');
        lines.push('# TYPE kafka_sent_ok counter');
        lines.push(`kafka_sent_ok ${this.kafkaMetrics.sentOK}`);
        lines.push('# HELP kafka_sent_fail Total number of message send failures');
        lines.push('# TYPE kafka_sent_fail counter');
        lines.push(`kafka_sent_fail ${this.kafkaMetrics.sentFail}`);
        lines.push('# HELP kafka_dlq_count Total number of messages routed to DLQ');
        lines.push('# TYPE kafka_dlq_count counter');
        lines.push(`kafka_dlq_count ${this.kafkaMetrics.dlqCount}`);
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
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('metrics'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "metrics", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        kafka_module_1.KafkaMetrics,
        redis_module_1.RecentActiveBatcher])
], AppController);
//# sourceMappingURL=app.controller.js.map