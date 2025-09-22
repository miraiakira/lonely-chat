import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PostEntity } from './entities/post.entity'
import { PostsService } from './posts.service'
import { PostsController } from './posts.controller'
import { User } from '../user/user.entity'
import { PostLike } from './entities/post-like.entity'
import { PostComment } from './entities/post-comment.entity'
import { SearchModule } from '../search/search.module'

@Module({
  imports: [TypeOrmModule.forFeature([PostEntity, PostLike, PostComment, User]), forwardRef(() => SearchModule)],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}