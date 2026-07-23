import { Get, Controller } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
    greetings(): string {
        return 'Hello, welcome to the Augmented Reality backend!';
    }
}