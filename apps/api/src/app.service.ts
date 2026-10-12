import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): { name: string; status: string; version: string } {
    return {
      name: 'Plataforma Integrada API',
      status: 'ok',
      version: '1.0',
    };
  }
}
