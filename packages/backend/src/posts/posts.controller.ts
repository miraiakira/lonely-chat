import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common'
 import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
 import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard'
 import { PostsService } from './posts.service'
 import { CreatePostDto } from './dto/create-post.dto'
 import { CreateCommentDto } from './dto/create-comment.dto'
 
 @Controller('posts')
 export class PostsController {
   constructor(private readonly posts: PostsService) {}
 
   @UseGuards(OptionalJwtAuthGuard)
   @Get()
   async list(@Req() req: any, @Query('limit') limit?: string, @Query('offset') offset?: string, @Query('includeHidden') includeHidden?: string) {
     const uid = req.user?.id
     return this.posts.list(Number(limit), Number(offset), uid, includeHidden === 'true')
   }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() body: CreatePostDto) {
    const userId = req.user?.id
    return this.posts.create(userId, body)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async like(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.id
    return this.posts.like(userId, id)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/unlike')
  async unlike(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.id
    return this.posts.unlike(userId, id)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  async addComment(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: CreateCommentDto) {
    const userId = req.user?.id
    return this.posts.addComment(userId, id, body)
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/comments')
  async listComments(@Param('id', ParseIntPipe) id: number, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.posts.listComments(id, Number(limit), Number(offset))
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/hide')
  async hide(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.id
    return this.posts.setHidden(userId, id, true)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/unhide')
  async unhide(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.id
    return this.posts.setHidden(userId, id, false)
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.id
    return this.posts.remove(userId, id)
  }
}