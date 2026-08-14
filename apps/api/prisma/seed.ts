import { PrismaClient, Role, CustomerStatus, LoyaltyMode, InvoiceStatus, AppointmentStatus, ActivityType, RedemptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Ananya', 'Ishita', 'Kavya', 'Diya', 'Rohan', 'Amit', 'Priya', 'Sunita', 'Raj', 'Neha', 'Vikram', 'Pooja', 'Aryan', 'Sara', 'Maya', 'Dev', 'Kiran', 'Leela', 'Nina', 'Ojas', 'Ravi', 'Tara', 'Uma', 'Varun'];
const LAST_NAMES = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Agarwal', 'Joshi', 'Mehta', 'Shah', 'Reddy', 'Nair', 'Menon', 'Desai', 'Iyer', 'Pillai', 'Rao', 'Chopra', 'Malhotra', 'Khanna'];
const SERVICES = [
  { name: 'Haircut Premium', duration: 45, price: 799, category: 'Hair' },
  { name: 'Hair Styling', duration: 60, price: 1499, category: 'Hair' },
  { name: 'Hair Color Full', duration: 120, price: 3499, category: 'Hair' },
  { name: 'Facial Gold', duration: 60, price: 1299, category: 'Skin' },
  { name: 'Facial Diamond', duration: 75, price: 2499, category: 'Skin' },
  { name: 'Manicure Classic', duration: 30, price: 599, category: 'Nails' },
  { name: 'Pedicure Spa', duration: 45, price: 899, category: 'Nails' },
  { name: 'Massage Therapy', duration: 60, price: 1999, category: 'Wellness' },
  { name: 'Bridal Makeup', duration: 120, price: 4999, category: 'Makeup' },
  { name: 'Threading & Waxing', duration: 20, price: 299, category: 'Grooming' },
];

const REWARDS_DATA = [
  { name: 'Free Haircut', description: 'Complimentary haircut on your next visit', pointsCost: 300, discountVal: 799 },
  { name: '20% Off Facial', description: 'Get 20% off on any facial service', pointsCost: 500, discountVal: 260 },
  { name: 'Free Manicure', description: 'Enjoy a complimentary classic manicure', pointsCost: 400, discountVal: 599 },
  { name: 'VIP Lounge Access', description: 'Access to VIP lounge for one visit', pointsCost: 200, discountVal: 0 },
  { name: 'Product Hamper', description: 'Premium hair care product hamper worth ₹2000', pointsCost: 1000, discountVal: 2000 },
  { name: 'Free Hair Spa', description: 'Luxurious hair spa treatment free', pointsCost: 700, discountVal: 1499 },
  { name: 'Birthday Special', description: 'Special birthday treatment package', pointsCost: 350, discountVal: 999 },
  { name: 'Referral Bonus', description: 'Redeem points for referring a friend bonus', pointsCost: 250, discountVal: 500 },
];

async function main() {
  console.log('Seeding Doloyal database...');

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ clerkId: 'dev-user' }, { email: 'demo@doloyal.ai' }],
    },
  });
  if (existingUser) {
    console.log('Seed data already exists. Skipping...');
    return;
  }

  const demoUser = await prisma.user.create({
    data: {
      clerkId: 'dev-user',
      email: 'demo@doloyal.ai',
      firstName: 'Demo',
      lastName: 'User',
    },
  });
  console.log('Created demo user');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Luxe Studio & Spa',
      slug: 'luxe-studio',
      category: 'BEAUTY_SALON',
      phone: '+91-9876543210',
      email: 'hello@luxestudio.in',
      address: '42, MG Road, Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      zip: '560038',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      brandColor: '#2563EB',
      gst: '29ABCDE1234F1ZG',
      businessHours: {
        Monday: { open: '09:00', close: '20:00' },
        Tuesday: { open: '09:00', close: '20:00' },
        Wednesday: { open: '09:00', close: '20:00' },
        Thursday: { open: '09:00', close: '20:00' },
        Friday: { open: '09:00', close: '21:00' },
        Saturday: { open: '10:00', close: '21:00' },
        Sunday: { open: '10:00', close: '18:00' },
      },
      taxRate: 18,
      onboardingComplete: true,
    },
  });
  console.log('Created tenant: Luxe Studio & Spa');

  await prisma.membership.create({
    data: { userId: demoUser.id, tenantId: tenant.id, role: 'OWNER' },
  });

  await prisma.loyaltyConfig.create({
    data: {
      tenantId: tenant.id,
      mode: 'POINTS_PER_SPEND',
      pointsPerUnit: 10,
      currencyUnit: 100,
      expiryDays: 365,
      pointsPerVisit: 10,
      signupBonus: 50,
      referralBonus: 100,
    },
  });

  await prisma.subscription.create({
    data: { tenantId: tenant.id, plan: 'GROWTH', status: 'ACTIVE' },
  });

  const branch = await prisma.branch.create({
    data: { tenantId: tenant.id, name: 'Luxe Studio Indiranagar', phone: '+91-9876543210', address: '42, MG Road, Indiranagar, Bangalore', city: 'Bangalore' },
  });

  const staffMembers = await Promise.all([
    prisma.staff.create({ data: { tenantId: tenant.id, branchId: branch.id, name: 'Priya Sharma', email: 'priya@luxestudio.in', phone: '+91-9876543211', roleTitle: 'Senior Stylist', isAvailable: true } }),
    prisma.staff.create({ data: { tenantId: tenant.id, branchId: branch.id, name: 'Anita Verma', email: 'anita@luxestudio.in', phone: '+91-9876543212', roleTitle: 'Facial Specialist', isAvailable: true } }),
    prisma.staff.create({ data: { tenantId: tenant.id, branchId: branch.id, name: 'Rahul Kumar', email: 'rahul@luxestudio.in', phone: '+91-9876543213', roleTitle: 'Nail Technician', isAvailable: true } }),
    prisma.staff.create({ data: { tenantId: tenant.id, branchId: branch.id, name: 'Deepa Iyer', email: 'deepa@luxestudio.in', phone: '+91-9876543214', roleTitle: 'Makeup Artist', isAvailable: true } }),
    prisma.staff.create({ data: { tenantId: tenant.id, branchId: branch.id, name: 'Rajesh Nair', email: 'rajesh@luxestudio.in', phone: '+91-9876543215', roleTitle: 'Massage Therapist', isAvailable: true } }),
  ]);

  const createdServices = await Promise.all(
    SERVICES.map((s) =>
      prisma.service.create({
        data: { tenantId: tenant.id, name: s.name, durationMinutes: s.duration, price: s.price, category: s.category, pointsMultiplier: 1.0, isActive: true },
      })
    )
  );

  const tiers = await Promise.all([
    prisma.membershipTier.create({ data: { tenantId: tenant.id, name: 'SILVER', price: 0, validityDays: 365, discountPercent: 10, bonusPointsPercent: 0, priorityBooking: false, benefits: ['10% off on services', 'Birthday treat'] } }),
    prisma.membershipTier.create({ data: { tenantId: tenant.id, name: 'GOLD', price: 999, validityDays: 365, discountPercent: 20, bonusPointsPercent: 50, priorityBooking: true, benefits: ['20% off on services', 'Free haircut every 6 months', 'Priority booking', 'Exclusive offers'] } }),
    prisma.membershipTier.create({ data: { tenantId: tenant.id, name: 'PLATINUM', price: 2999, validityDays: 365, discountPercent: 30, bonusPointsPercent: 100, priorityBooking: true, benefits: ['30% off on services', 'Free monthly service', 'VIP lounge access', 'Priority booking', 'Free home service', 'Annual hamper'] } }),
  ]);

  const rewards = await Promise.all(
    REWARDS_DATA.map((r) =>
      prisma.reward.create({
        data: { tenantId: tenant.id, name: r.name, description: r.description, pointsCost: r.pointsCost, discountVal: r.discountVal, status: 'ACTIVE' },
      })
    )
  );

  const customers: any[] = [];
  for (let i = 0; i < 200; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const daysAgo = Math.floor(Math.random() * 90);
    const createdAt = new Date(Date.now() - daysAgo * 86400000);
    const hasVisited = Math.random() > 0.15;
    const totalVisits = hasVisited ? Math.floor(Math.random() * 15) + 1 : 0;
    const avgSpendPerVisit = 500 + Math.random() * 2000;
    const totalSpent = Math.round(totalVisits * avgSpendPerVisit * 100) / 100;
    const lastVisitAt = hasVisited ? new Date(Date.now() - Math.random() * 60 * 86400000) : null;
    const pointsBalance = Math.floor(totalSpent / 10);

    let status: CustomerStatus = 'ACTIVE';
    if (!hasVisited || (lastVisitAt && (Date.now() - lastVisitAt.getTime()) > 60 * 86400000)) {
      status = 'INACTIVE';
    }
    if (totalSpent > 50000) status = 'ACTIVE';

    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
        phone: `+91-9876${String(50000 + i).padStart(5, '0')}`,
        status,
        pointsBalance,
        totalSpent,
        totalVisits,
        churnRiskScore: hasVisited ? Math.random() * 0.5 : 0.5 + Math.random() * 0.5,
        lastVisitAt,
        createdAt,
        tags: i % 3 === 0 ? ['VIP', 'Regular'] : i % 5 === 0 ? ['New'] : ['Regular'],
        notes: i % 10 === 0 ? `Prefers weekend appointments. Allergic to certain products.` : null,
      },
    });
    customers.push(customer);
  }
  console.log(`Created ${customers.length} customers`);

  let invoiceCount = 0;
  for (const customer of customers) {
    if (customer.totalVisits === 0) continue;
    const numInvoices = Math.min(customer.totalVisits, 15);
    for (let v = 0; v < numInvoices; v++) {
      invoiceCount++;
      const invoiceDate = new Date(customer.createdAt.getTime() + (v + 1) * (86400000 * 3));
      if (invoiceDate > new Date()) continue;

      const serviceIdx = Math.floor(Math.random() * SERVICES.length);
      const service = SERVICES[serviceIdx];
      const qty = Math.floor(Math.random() * 2) + 1;
      const subtotal = service.price * qty;
      const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1) : 0;
      const tax = Math.round((subtotal - discount) * 0.18 * 100) / 100;
      const total = Math.round((subtotal - discount + tax) * 100) / 100;

      const invoiceNumber = `INV-${String(invoiceCount).padStart(5, '0')}`;

      await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          invoiceNumber,
          subtotal,
          discount,
          tax,
          total,
          status: 'PAID',
          paymentMethod: ['CASH', 'UPI', 'CARD'][Math.floor(Math.random() * 3)],
          paidAt: invoiceDate,
          createdAt: invoiceDate,
          items: {
            create: {
              description: service.name,
              quantity: qty,
              unitPrice: service.price,
              total: subtotal,
            },
          },
        },
      });
    }
  }
  console.log(`Created ${invoiceCount} invoices`);

  for (const customer of customers) {
    if (customer.pointsBalance === 0) continue;
    const totalPoints = customer.pointsBalance;
    await prisma.pointsLedger.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        amount: totalPoints,
        balanceAfter: totalPoints,
        reason: 'Points from service purchases',
      },
    });
  }
  console.log('Created points ledger entries');

  let apptCount = 0;
  for (const customer of customers) {
    if (customer.totalVisits === 0 || Math.random() > 0.3) continue;
    const numAppts = Math.min(Math.floor(Math.random() * 3) + 1, customer.totalVisits);
    for (let a = 0; a < numAppts; a++) {
      apptCount++;
      const daysAgo = Math.floor(Math.random() * 60);
      const startTime = new Date(Date.now() - daysAgo * 86400000);
      startTime.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15, 0, 0);
      const endTime = new Date(startTime.getTime() + 60 * 60000);
      const statuses: AppointmentStatus[] = ['COMPLETED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'];
      const status = daysAgo > 0 ? 'COMPLETED' : statuses[Math.floor(Math.random() * statuses.length)];
      const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
      const staff = staffMembers[Math.floor(Math.random() * staffMembers.length)];

      await prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          staffId: staff.id,
          serviceName: service.name,
          startTime,
          endTime,
          status,
          notes: Math.random() > 0.8 ? 'Customer requested extra care' : null,
        },
      });
    }
  }
  console.log(`Created ${apptCount} appointments`);

  for (const customer of customers) {
    if (customer.totalVisits === 0) continue;
    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        type: 'CUSTOMER_CREATED',
        message: `${customer.firstName} ${customer.lastName} became a customer`,
        createdAt: customer.createdAt,
      },
    });
    if (customer.totalSpent > 10000) {
      await prisma.activity.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          type: 'INVOICE_PAID',
          message: `${customer.firstName} ${customer.lastName} spent over ₹10,000 total`,
        },
      });
    }
    if (customer.totalVisits > 10) {
      await prisma.activity.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          type: 'NOTE_ADDED',
          message: `${customer.firstName} ${customer.lastName} marked as loyal customer (${customer.totalVisits}+ visits)`,
        },
      });
    }
  }
  console.log('Created activities');

  let redemptionCount = 0;
  for (const customer of customers) {
    if (customer.pointsBalance < 300 || Math.random() > 0.2) continue;
    const affordableRewards = rewards.filter((r) => r.pointsCost <= customer.pointsBalance);
    if (affordableRewards.length === 0) continue;
    const reward = affordableRewards[Math.floor(Math.random() * affordableRewards.length)];
    const code = `RDM-${String(customer.id).slice(0, 6).toUpperCase()}-${String(redemptionCount).padStart(3, '0')}`;

    const newBalance = customer.pointsBalance - reward.pointsCost;
    await prisma.rewardRedemption.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        rewardId: reward.id,
        code,
        status: Math.random() > 0.3 ? 'FULFILLED' : 'PENDING',
        redeemedAt: Math.random() > 0.3 ? new Date() : null,
      },
    });

    await prisma.pointsLedger.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        amount: -reward.pointsCost,
        balanceAfter: newBalance,
        reason: `Redeemed: ${reward.name}`,
      },
    });

    await prisma.customer.update({
      where: { id: customer.id },
      data: { pointsBalance: newBalance },
    });

    await prisma.reward.update({
      where: { id: reward.id },
      data: { redeemedCount: { increment: 1 } },
    });

    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        type: 'POINTS_REDEEMED',
        message: `${customer.firstName} ${customer.lastName} redeemed ${reward.pointsCost} points for ${reward.name}`,
      },
    });

    redemptionCount++;
  }
  console.log(`Created ${redemptionCount} redemptions`);

  for (let i = 0; i < 10; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    const existing = await prisma.customerMembership.findUnique({
      where: { customerId_tierId: { customerId: customer.id, tierId: tier.id } },
    });
    if (!existing) {
      await prisma.customerMembership.create({
        data: { customerId: customer.id, tierId: tier.id },
      });
      await prisma.activity.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          type: 'TIER_UPGRADED',
          message: `${customer.firstName} ${customer.lastName} upgraded to ${tier.name} membership`,
        },
      });
    }
  }
  console.log('Created membership assignments');

  console.log('\nSeed complete!');
  console.log(`  Tenant: Luxe Studio & Spa`);
  console.log(`  Customers: ${customers.length}`);
  console.log(`  Invoices: ${invoiceCount}`);
  console.log(`  Appointments: ${apptCount}`);
  console.log(`  Redemptions: ${redemptionCount}`);
  console.log(`\nDemo login: demo@doloyal.ai (mock auth)`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
