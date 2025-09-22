import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserProfile } from './user-profile.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile]), forwardRef(() => AuthModule), forwardRef(() => SearchModule)],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
