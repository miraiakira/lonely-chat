import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { UserModule } from '../../user/user.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [UserModule, AuthModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}