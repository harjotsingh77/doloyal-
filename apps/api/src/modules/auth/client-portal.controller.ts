import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { AllowCustomer } from '../../common/allow-customer.decorator';
import { CustomersService } from '../customers/customers.service';

@Controller('client')
@AllowCustomer()
export class ClientPortalController {
  constructor(private readonly customers: CustomersService) {}

  @Get('me')
  async me(@CurrentUser() user: any) {
    if (user.sessionKind !== 'customer' && user.activeRole !== 'CUSTOMER') {
      return { error: 'Customer session required' };
    }
    if (user.needsPhone || !user.customerId) {
      return {
        needsPhone: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone ?? null,
        },
      };
    }
    const portal = await this.customers.getClientPortal(user.activeTenantId, user.id);
    return { needsPhone: false, ...portal };
  }
}
