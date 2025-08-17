import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SupabaseService, UploadSignedUrlResponse } from './supabase.service';
import { BearerTokenGuard } from '../auth/guards/bearer.guard';

// @Controller('files')
// export class FileController {
//   constructor(private readonly supabaseService: SupabaseService) {}

//   @Get('signed-url')
//   @UseGuards(BearerTokenGuard)
//   async getSignedUrl(
//     @Query('path') path: string,
//   ): Promise<UploadSignedUrlResponse> {
//     try {
//       const data = await this.supabaseService.createSignedUrl(
//         process.env.SUPABASE_BUCKETNAME,
//         path,
//       );
//       return data;
//     } catch (error) {}
//   }
// }
