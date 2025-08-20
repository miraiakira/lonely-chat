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
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string }> {
    const fileName = `${Date.now()}-${file.originalname}`;
    const fileStream = fs.createReadStream(file.path);
    await this.minioClient.putObject(
      this.bucketName,
      fileName,
      fileStream,
      file.size,
    );
    await fs.promises.unlink(file.path);
    return {
      url: `http://${this.configService.get(
        'MINIO_EXTERNAL_ENDPOINT',
        'localhost',
      )}:${this.configService.get('MINIO_PORT', '9000')}/${this.bucketName}/${fileName}`,
    };
  }
}