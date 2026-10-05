import bcrypt from 'bcrypt';
import { userRepository } from '../repositories/user.repository.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt.js';
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '../errors/index.js';

const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890123456789012';

export class AuthService {
  constructor(userRepo = userRepository) {
    this.userRepo = userRepo;
  }

  async register({ email, password, role = 'viewer', technicianId = null }) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepo.create({
      email,
      passwordHash,
      role,
      technicianId,
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepo.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt,
    });

    return { user, accessToken, refreshToken };
  }

  async login({ email, password }) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      throw new UnauthorizedError('Неверные учетные данные');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Неверные учетные данные');
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepo.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt,
    });

    return { user, accessToken, refreshToken };
  }

  async refresh(tokenFromCookie) {
    if (!tokenFromCookie) {
      throw new UnauthorizedError('Refresh-токен отсутствует');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(tokenFromCookie);
    } catch {
      throw new UnauthorizedError('Невалидный или истекший refresh-токен');
    }

    const storedToken = await this.userRepo.findRefreshToken(tokenFromCookie);
    if (!storedToken) {
      await this.userRepo.deleteAllUserRefreshTokens(decoded.userId);
      throw new ForbiddenError('Подозрительная активность, сессия аннулирована');
    }

    if (new Date(storedToken.expiresAt) < new Date()) {
      await this.userRepo.deleteRefreshToken(tokenFromCookie);
      throw new UnauthorizedError('Срок действия refresh-токена истек');
    }

    const user = await this.userRepo.findById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('Пользователь не найден');
    }

    await this.userRepo.deleteRefreshToken(tokenFromCookie);

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepo.createRefreshToken({
      token: newRefreshToken,
      userId: user.id,
      expiresAt,
    });

    return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(tokenFromCookie) {
    if (tokenFromCookie) {
      await this.userRepo.deleteRefreshToken(tokenFromCookie);
    }
  }

  async getMe(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }
    return user;
  }
}

export const authService = new AuthService();
