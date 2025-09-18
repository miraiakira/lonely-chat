import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class FileService implements OnModuleInit {
    private readonly configService;
    private readonly minioClient;
    private readonly bucketName;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    uploadFile(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    uploadBuffer(buffer: Buffer, fileName: string, contentType?: string): Promise<{
        url: string;
    }>;
}
