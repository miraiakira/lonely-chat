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
var FileService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Minio = __importStar(require("minio"));
const fs = __importStar(require("fs"));
let FileService = FileService_1 = class FileService {
    configService;
    minioClient;
    bucketName;
    logger = new common_1.Logger(FileService_1.name);
    constructor(configService) {
        this.configService = configService;
        this.minioClient = new Minio.Client({
            endPoint: this.configService.get('MINIO_ENDPOINT', 'localhost'),
            port: parseInt(this.configService.get('MINIO_PORT', '9000')),
            useSSL: false,
            accessKey: this.configService.get('MINIO_ACCESS_KEY', ''),
            secretKey: this.configService.get('MINIO_SECRET_KEY', ''),
        });
        this.bucketName = this.configService.get('MINIO_BUCKET_NAME', 'avatars');
    }
    async onModuleInit() {
        const bucketExists = await this.minioClient.bucketExists(this.bucketName);
        if (!bucketExists) {
            this.logger.log(`Bucket ${this.bucketName} does not exist. Creating...`);
            await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
            this.logger.log(`Bucket ${this.bucketName} created.`);
        }
        else {
            this.logger.log(`Bucket ${this.bucketName} already exists.`);
        }
    }
    async uploadFile(file) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const fileStream = fs.createReadStream(file.path);
        await this.minioClient.putObject(this.bucketName, fileName, fileStream, file.size);
        await fs.promises.unlink(file.path);
        return {
            url: `http://${this.configService.get('MINIO_ENDPOINT', 'localhost')}:${this.configService.get('MINIO_PORT', '9000')}/${this.bucketName}/${fileName}`,
        };
    }
};
exports.FileService = FileService;
exports.FileService = FileService = FileService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FileService);
//# sourceMappingURL=file.service.js.map