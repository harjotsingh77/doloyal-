import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  /** Updates for the signed-in staff member's active business. */
  @Get('feed')
  feed(@CurrentUser() user: any) {
    return this.notifications.getFeed(user);
  }
}
