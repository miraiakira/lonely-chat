import { Module, forwardRef } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ElasticsearchModule } from '@nestjs/elasticsearch'
import { SearchService } from './search.service'
import { SearchController } from './search.controller'
import { UserModule } from '../user/user.module'
import { PostsModule } from '../posts/posts.module'

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => UserModule),
    forwardRef(() => PostsModule),
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        node: config.get<string>('ELASTICSEARCH_NODE', 'http://localhost:9200'),
        headers: {
          accept: 'application/vnd.elasticsearch+json; compatible-with=8',
          'content-type': 'application/vnd.elasticsearch+json; compatible-with=8',
        },
      }),
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}