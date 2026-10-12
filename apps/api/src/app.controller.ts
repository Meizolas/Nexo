import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './modules/auth/auth.decorators.js';

@ApiTags('application')
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        name: 'Plataforma Integrada API',
        status: 'ok',
        version: '1.0',
      },
    },
  })
  getInfo(): { name: string; status: string; version: string } {
    return this.appService.getInfo();
  }
}
