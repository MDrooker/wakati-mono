import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtService } from '../service/jwt.service';
import { UserTokenData } from '../service/jwt.service';

describe('JwtService', () => {
  let service: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET') || 'test-secret',
            signOptions: {
              expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
            },
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [JwtService],
    }).compile();

    service = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', async () => {
      const userData: UserTokenData = {
        sub: '123',
        userurn: 'testuser',
        roles: ['user', 'admin'],
      };

      const result = await service.generateToken(userData);

      expect(result).toBeDefined();
      expect(result.access_token).toBeDefined();
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBeGreaterThan(0);
      expect(typeof result.access_token).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', async () => {
      const userData: UserTokenData = {
        sub: '123',
        userurn: 'testuser',
        roles: ['user'],
      };

      const tokenResponse = await service.generateToken(userData);
      const payload = await service.verifyToken(tokenResponse.access_token);

      expect(payload).toBeDefined();
      expect(payload.sub).toBe(userData.sub);
      expect(payload.username).toBe(userData.userurn);
      expect(payload.roles).toEqual(userData.roles);
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';

      await expect(service.verifyToken(invalidToken)).rejects.toThrow(
        'Invalid or expired token',
      );
    });
  });

  describe('decodeToken', () => {
    it('should decode a token without verification', async () => {
      const userData: UserTokenData = {
        sub: '123',
        userurn: 'testuser',
        roles: ['user'],
      };

      const tokenResponse = await service.generateToken(userData);
      const payload = service.decodeToken(tokenResponse.access_token);

      expect(payload).toBeDefined();
      expect(payload?.sub).toBe(userData.sub);
      expect(payload?.username).toBe(userData.userurn);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token';
      const result = service.decodeToken(invalidToken);

      expect(result).toBeNull();
    });
  });
});
