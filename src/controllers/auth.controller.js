import { authService } from '../services/auth.service.js';
import { getRefreshTokenCookieOptions } from '../lib/jwt.js';

export class AuthController {
  constructor(service = authService) {
    this.service = service;
  }

  register = async (req, res) => {
    const { user, accessToken, refreshToken } = await this.service.register(req.valid.body);
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
    return res.status(201).json({
      data: {
        user,
        accessToken,
      },
    });
  };

  login = async (req, res) => {
    const { user, accessToken, refreshToken } = await this.service.login(req.valid.body);
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
    return res.status(200).json({
      data: {
        user,
        accessToken,
      },
    });
  };

  refresh = async (req, res) => {
    const tokenFromCookie = req.cookies?.refreshToken;
    const { user, accessToken, refreshToken } = await this.service.refresh(tokenFromCookie);
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
    return res.status(200).json({
      data: {
        user,
        accessToken,
      },
    });
  };

  logout = async (req, res) => {
    const tokenFromCookie = req.cookies?.refreshToken;
    await this.service.logout(tokenFromCookie);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.status(200).json({ message: 'Сессия успешно завершена' });
  };

  me = async (req, res) => {
    const user = await this.service.getMe(req.user.userId);
    return res.status(200).json({ data: user });
  };
}

export const authController = new AuthController();
