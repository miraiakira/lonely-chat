import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FriendRequest } from './friend-request.entity'
import { FriendRelation } from './friend.entity'
import { FriendService } from './friend.service'
import { FriendController } from './friend.controller'
import { User } from '../user/user.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [TypeOrmModule.forFeature([FriendRequest, FriendRelation, User]), forwardRef(() => AuthModule)],
  providers: [FriendService],
  controllers: [FriendController],
  exports: [FriendService],
})
export class FriendModule {}