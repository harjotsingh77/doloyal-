import { SetMetadata } from '@nestjs/common';

export const ALLOW_CUSTOMER_KEY = 'allowCustomer';

/** Marks a route as reachable by a customer Client Page session. */
export const AllowCustomer = () => SetMetadata(ALLOW_CUSTOMER_KEY, true);
