import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PostEntity } from './entities/post.entity'
import { PostsService } from './posts.service'
import { PostsController } from './posts.controller'
import { User } from '../user/user.entity'
import { PostLike } from './entities/post-like.entity'
import { PostComment } from './entities/post-comment.entity'

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, PostLike, PostComment, User])],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}