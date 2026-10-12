import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('application info', () => {
    it('returns the API identity and status', () => {
      expect(appController.getInfo()).toEqual({
        name: 'Plataforma Integrada API',
        status: 'ok',
        version: '1.0',
      });
    });
  });
});
