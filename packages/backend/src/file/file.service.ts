import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as fs from 'fs';

@Injectable()
export class FileService implements OnModuleInit {
  private readonly minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(FileService.name);

  constructor(private readonly configService: ConfigService) {
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
    } else {
      this.logger.log(`Bucket ${this.bucketName} already exists.`);
    }

    // Ensure public read policy so avatars can be accessed by the browser directly
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetBucketLocation', 's3:ListBucket'],
            Resource: [`arn:aws:s3:::${this.bucketName}`],
          },
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      } as const;
      // Types for minio v8 client are missing setBucketPolicy, but runtime supports it
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await (this.minioClient as any).setBucketPolicy(this.bucketName, JSON.stringify(policy));
      this.logger.log(`Public read policy applied to bucket ${this.bucketName}.`);
    } catch (e) {
      this.logger.warn(`Failed to set bucket policy: ${String(e)}`);
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string }> {
    const fileName = `${Date.now()}-${file.originalname}`;
    const fileStream = fs.createReadStream(file.path);
    await this.minioClient.putObject(
      this.bucketName,
      fileName,
      fileStream,
      file.size,
      {
        'Content-Type': file.mimetype || 'application/octet-stream',
      } as any,
    );
    await fs.promises.unlink(file.path);
    return {
      url: `http://${this.configService.get(
        'MINIO_EXTERNAL_ENDPOINT',
        'localhost',
      )}:${this.configService.get('MINIO_PORT', '9000')}/${this.bucketName}/${fileName}`,
    };
  }

  // 直接上传内存中的二进制数据（用于会话合成头像 SVG）
  async uploadBuffer(buffer: Buffer, fileName: string, contentType = 'application/octet-stream'): Promise<{ url: string }> {
    await this.minioClient.putObject(
      this.bucketName,
      fileName,
      buffer,
      buffer.length,
      {
        'Content-Type': contentType,
      } as any,
    );
    return {
      url: `http://${this.configService.get('MINIO_EXTERNAL_ENDPOINT', 'localhost')}:${this.configService.get('MINIO_PORT', '9000')}/${this.bucketName}/${fileName}`,
    };
  }
}