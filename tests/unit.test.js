import { jest } from '@jest/globals';
import { RequestService, ALLOWED_TRANSITIONS } from '../src/services/request.service.js';
import { requireRole, authenticate } from '../src/middlewares/auth.middleware.js';
import { WeatherService } from '../src/services/weather.service.js';
import { signAccessToken } from '../src/lib/jwt.js';
import {
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
  ForbiddenError,
  UnauthorizedError,
} from '../src/errors/index.js';

describe('Unit Tests — Pure Business Logic & Middlewares', () => {
  describe('1. State Machine Transitions (ALLOWED_TRANSITIONS)', () => {
    it('должен иметь корректную конфигурацию разрешённых переходов', () => {
      expect(ALLOWED_TRANSITIONS.new).toEqual(['in_progress', 'rejected']);
      expect(ALLOWED_TRANSITIONS.in_progress).toEqual(['done', 'rejected']);
      expect(ALLOWED_TRANSITIONS.done).toEqual([]);
      expect(ALLOWED_TRANSITIONS.rejected).toEqual([]);
    });

    it('должен разрешать переход new -> in_progress при наличии назначенных исполнителей', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'new' }),
        countAssignees: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue({ id: 'req-1', status: 'in_progress' }),
      };
      const service = new RequestService(mockReqRepo, {});

      const result = await service.updateStatus('req-1', 'in_progress', 'admin@energy.local');
      expect(result.status).toBe('in_progress');
      expect(mockReqRepo.countAssignees).toHaveBeenCalledWith('req-1');
      expect(mockReqRepo.update).toHaveBeenCalledWith(
        'req-1',
        { status: 'in_progress' },
        { changedBy: 'admin@energy.local', comment: null }
      );
    });

    it('должен отклонять перевод в in_progress, если в заявке нет назначенных исполнителей (ConflictError)', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'new' }),
        countAssignees: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      };
      const service = new RequestService(mockReqRepo, {});

      await expect(service.updateStatus('req-1', 'in_progress')).rejects.toThrow(ConflictError);
      expect(mockReqRepo.update).not.toHaveBeenCalled();
    });

    it('должен отклонять недопустимый переход new -> done (ConflictError)', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'new' }),
        update: jest.fn(),
      };
      const service = new RequestService(mockReqRepo, {});

      await expect(service.updateStatus('req-1', 'done')).rejects.toThrow(ConflictError);
      expect(mockReqRepo.update).not.toHaveBeenCalled();
    });

    it('должен отклонять любой переход из терминального статуса done (ConflictError)', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'done' }),
        update: jest.fn(),
      };
      const service = new RequestService(mockReqRepo, {});

      await expect(service.updateStatus('req-1', 'in_progress')).rejects.toThrow(ConflictError);
      await expect(service.updateStatus('req-1', 'rejected')).rejects.toThrow(ConflictError);
      expect(mockReqRepo.update).not.toHaveBeenCalled();
    });

    it('должен отклонять любой переход из терминального статуса rejected (ConflictError)', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'rejected' }),
        update: jest.fn(),
      };
      const service = new RequestService(mockReqRepo, {});

      await expect(service.updateStatus('req-1', 'new')).rejects.toThrow(ConflictError);
      await expect(service.updateStatus('req-1', 'in_progress')).rejects.toThrow(ConflictError);
      expect(mockReqRepo.update).not.toHaveBeenCalled();
    });

    it('техник может менять статус только назначенной на него заявки', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'in_progress' }),
        isTechnicianAssigned: jest.fn().mockResolvedValue(true),
        update: jest.fn().mockResolvedValue({ id: 'req-1', status: 'done' }),
      };
      const service = new RequestService(mockReqRepo, {});

      const techUser = { role: 'technician', technicianId: 'tech-uuid-1', email: 'tech@energy.local' };
      const res = await service.updateStatus('req-1', 'done', 'system', 'Работа выполнена', techUser);
      expect(res.status).toBe('done');
      expect(mockReqRepo.isTechnicianAssigned).toHaveBeenCalledWith('req-1', 'tech-uuid-1');
    });

    it('техник получает 403 ForbiddenError при попытке изменить не назначенную на него заявку', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'in_progress' }),
        isTechnicianAssigned: jest.fn().mockResolvedValue(false),
      };
      const service = new RequestService(mockReqRepo, {});

      const unassignedTech = { role: 'technician', technicianId: 'tech-other', email: 'other@energy.local' };
      await expect(
        service.updateStatus('req-1', 'done', 'system', null, unassignedTech)
      ).rejects.toThrow(ForbiddenError);
    });

    it('пользователь с ролью viewer получает 403 ForbiddenError при попытке изменить статус', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'new' }),
      };
      const service = new RequestService(mockReqRepo, {});

      const viewerUser = { role: 'viewer', email: 'viewer@energy.local' };
      await expect(
        service.updateStatus('req-1', 'in_progress', 'system', null, viewerUser)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('2. Brigade Assignment Rules (setAssignees)', () => {
    it('должен выбрасывать UnprocessableEntityError, если нет ни одного ведущего (lead)', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'new' }),
      };
      const service = new RequestService(mockReqRepo, {});

      const body = {
        assignees: [
          { technicianId: 'tech-1', role: 'member' },
          { technicianId: 'tech-2', role: 'member' },
        ],
      };

      await expect(service.setAssignees('req-1', body)).rejects.toThrow(UnprocessableEntityError);
    });

    it('должен выбрасывать UnprocessableEntityError, если назначено более одного lead', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'new' }),
      };
      const service = new RequestService(mockReqRepo, {});

      const body = {
        assignees: [
          { technicianId: 'tech-1', role: 'lead' },
          { technicianId: 'tech-2', role: 'lead' },
        ],
      };

      await expect(service.setAssignees('req-1', body)).rejects.toThrow(UnprocessableEntityError);
    });

    it('должен выбрасывать ConflictError при дублировании специалиста в бригаде', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'new' }),
      };
      const service = new RequestService(mockReqRepo, {});

      const body = {
        assignees: [
          { technicianId: 'tech-1', role: 'lead' },
          { technicianId: 'tech-1', role: 'member' },
        ],
      };

      await expect(service.setAssignees('req-1', body)).rejects.toThrow(ConflictError);
    });

    it('должен выбрасывать NotFoundError, если техник не существует в справочнике', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'new' }),
        findTechnicianById: jest.fn().mockResolvedValue(null),
      };
      const service = new RequestService(mockReqRepo, {});

      const body = {
        assignees: [{ technicianId: 'non-existent-tech', role: 'lead' }],
      };

      await expect(service.setAssignees('req-1', body)).rejects.toThrow(NotFoundError);
    });

    it('должен успешно сохранять корректную бригаду (ровно 1 lead, уникальные специалисты)', async () => {
      const mockReqRepo = {
        findById: jest.fn().mockResolvedValue({ id: 'req-1', status: 'new' }),
        findTechnicianById: jest
          .fn()
          .mockImplementation((id) => Promise.resolve({ id, fullName: `Tech ${id}` })),
        setAssignees: jest.fn().mockResolvedValue([
          { requestId: 'req-1', technicianId: 'tech-1', role: 'lead' },
          { requestId: 'req-1', technicianId: 'tech-2', role: 'member' },
        ]),
      };
      const service = new RequestService(mockReqRepo, {});

      const body = {
        assignees: [
          { technicianId: 'tech-1', role: 'lead', hours: 4 },
          { technicianId: 'tech-2', role: 'member', hours: 2 },
        ],
      };

      const result = await service.setAssignees('req-1', body);
      expect(result).toHaveLength(2);
      expect(mockReqRepo.setAssignees).toHaveBeenCalledWith('req-1', body.assignees);
    });
  });

  describe('3. Role Middleware & Authentication Unit Tests', () => {
    describe('requireRole', () => {
      it('должен вызывать next с UnauthorizedError (401), если req.user отсутствует', () => {
        const middleware = requireRole('admin');
        const req = {};
        const res = {};
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(UnauthorizedError);
        expect(err.status).toBe(401);
        expect(err.code).toBe('UNAUTHORIZED');
      });

      it('должен вызывать next с ForbiddenError (403), если роль пользователя не входит в разрешённые', () => {
        const middleware = requireRole('admin', 'technician');
        const req = { user: { role: 'viewer', email: 'viewer@energy.local' } };
        const res = {};
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(ForbiddenError);
        expect(err.status).toBe(403);
        expect(err.code).toBe('FORBIDDEN');
      });

      it('должен пропускать пользователя (next() без ошибки), если роль разрешена', () => {
        const middleware = requireRole('admin', 'technician');
        const req = { user: { role: 'technician', email: 'tech@energy.local' } };
        const res = {};
        const next = jest.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
      });
    });

    describe('authenticate', () => {
      it('должен возвращать 401 UnauthorizedError при отсутствии Authorization заголовка', () => {
        const req = { headers: {} };
        const res = {};
        const next = jest.fn();

        authenticate(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(UnauthorizedError);
      });

      it('должен возвращать 401 UnauthorizedError при невалидном Bearer токене', () => {
        const req = { headers: { authorization: 'Bearer invalid.jwt.token' } };
        const res = {};
        const next = jest.fn();

        authenticate(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0][0];
        expect(err).toBeInstanceOf(UnauthorizedError);
      });

      it('должен расшифровывать валидный JWT токен и помещать пользователя в req.user', () => {
        const userPayload = {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'admin@energy.local',
          role: 'admin',
          technicianId: null,
        };
        const token = signAccessToken(userPayload);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = {};
        const next = jest.fn();

        authenticate(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(req.user).toBeDefined();
        expect(req.user.email).toBe('admin@energy.local');
        expect(req.user.role).toBe('admin');
      });
    });
  });

  describe('4. Weather Service Suitability Evaluation Unit Tests', () => {
    it('должен определять погодную безопасность на основе порогов ветра и осадков', async () => {
      const weatherService = new WeatherService();

      const mockApiResponse = {
        daily: {
          time: ['2026-10-15', '2026-10-16', '2026-10-17'],
          temperature_2m_max: [14.5, 12.0, 10.0],
          temperature_2m_min: [6.0, 5.0, 3.0],
          precipitation_sum: [0.0, 5.0, 0.2], // день 2: много осадков
          wind_speed_10m_max: [5.2, 8.0, 15.4], // день 3: сильный ветер (> 12 м/с)
        },
      };

      jest.spyOn(weatherService, 'fetchWithTimeout').mockResolvedValue(mockApiResponse);

      const result = await weatherService.getForecastAndSuitability(60.71, 28.74, 3);

      expect(result.forecast).toHaveLength(3);

      // День 1: безопасный
      expect(result.forecast[0].isSuitableForOutdoorWork).toBe(true);
      expect(result.forecast[0].safetyFactors.windSafe).toBe(true);
      expect(result.forecast[0].safetyFactors.precipitationSafe).toBe(true);

      // День 2: превышение осадков
      expect(result.forecast[1].isSuitableForOutdoorWork).toBe(false);
      expect(result.forecast[1].safetyFactors.precipitationSafe).toBe(false);

      // День 3: превышение скорости ветра
      expect(result.forecast[2].isSuitableForOutdoorWork).toBe(false);
      expect(result.forecast[2].safetyFactors.windSafe).toBe(false);
    });
  });
});
