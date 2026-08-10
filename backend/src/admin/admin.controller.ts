import { Controller, Post, HttpCode, UseGuards } from '@nestjs/common';
import { DemoResetGuard } from './guards/demo-reset.guard';
import { AdminService } from './admin.service';
import { ADMIN_SUCCESS } from '../common/constants/success-messages.constants';

@UseGuards(DemoResetGuard)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // 200, not the @Post default of 201 — this isn't creating a resource,
  // it's an idempotent-in-effect reset action.
  @Post('demo-reset')
  @HttpCode(200)
  async demoReset() {
    const counts = await this.adminService.resetDemoData();
    return { message: ADMIN_SUCCESS.DEMO_DATA_RESET, ...counts };
  }
}
