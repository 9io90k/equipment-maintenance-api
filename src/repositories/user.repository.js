import { User, RefreshToken, Technician } from '../models/index.js';

export class UserRepository {
  constructor(userModel = User, tokenModel = RefreshToken) {
    this.userModel = userModel;
    this.tokenModel = tokenModel;
  }

  async findByEmail(email) {
    return this.userModel.findOne({
      where: { email: email.toLowerCase() },
      include: [{ model: Technician, as: 'technician' }],
    });
  }

  async findById(id) {
    return this.userModel.findByPk(id, {
      include: [{ model: Technician, as: 'technician' }],
    });
  }

  async create(data) {
    return this.userModel.create({
      ...data,
      email: data.email.toLowerCase(),
    });
  }

  async findRefreshToken(token) {
    return this.tokenModel.findOne({ where: { token } });
  }

  async createRefreshToken(data) {
    return this.tokenModel.create(data);
  }

  async deleteRefreshToken(token) {
    return this.tokenModel.destroy({ where: { token } });
  }

  async deleteAllUserRefreshTokens(userId) {
    return this.tokenModel.destroy({ where: { userId } });
  }
}

export const userRepository = new UserRepository();
