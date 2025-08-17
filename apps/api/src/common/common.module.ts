import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health/health.controller';
import { SimpleHealthController } from './health/simple-health.controller';
import { MediaTypeValidationService } from './media/services';

declare global {
  interface String {
    interpolate(params: Record<string, any>): string;
  }
}
String.prototype.interpolate = function (params) {
  const names = Object.keys(params);
  const vals = Object.values(params);
  return new Function(...names, `return \`${this}\`;`)(...vals);
};

@Module({
  imports: [TerminusModule],
  providers: [MediaTypeValidationService],
  controllers: [HealthController, SimpleHealthController],
  exports: [MediaTypeValidationService],
})
export class CommonModule {}
