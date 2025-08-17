import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthGuard } from '../security/health.guard';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  public constructor(
    private readonly health: HealthCheckService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @UseGuards(HealthGuard)
  public getHealth() {
    return 'OK';
  }
  @Get('detailed')
  getDetailedHealth() {
    this.logger.log('Detailed health check requested');

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      process: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      environment: Object.keys(process.env)
        .filter(
          (key) =>
            !key.includes('SECRET') &&
            !key.includes('KEY') &&
            !key.includes('TOKEN') &&
            !key.includes('SIGNING') &&
            !key.includes('PASSWORD') &&
            !key.includes('SECRET_') &&
            !key.includes('DATABASE_URL') &&
            !key.includes('PASSWORD'),
        )
        .reduce(
          (env, key) => {
            env[key] = process.env[key];
            return env;
          },
          {} as Record<string, string>,
        ),
    };
  }
}
