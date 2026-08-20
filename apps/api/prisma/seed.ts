import {
  PrismaClient,
  Role,
  CustomerStatus,
  LoyaltyMode,
  InvoiceStatus,
  AppointmentStatus,
  ActivityType,
  RedemptionStatus,
} from '@prisma/client';
import { HELP_ARTICLES } from './help-articles';

const prisma = new PrismaClient();

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Ananya', 'Ishita',
  'Kavya', 'Diya', 'Rohan', 'Amit', 'Priya', 'Sunita', 'Raj', 'Neha',
  'Vikram', 'Pooja', 'Aryan', 'Sara', 'Maya', 'Dev', 'Kiran', 'Leela',
  'Nina', 'Ojas', 'Ravi', 'Tara', 'Uma', 'Varun', 'Simran', 'Kunal',
  'Meera', 'Gaurav', 'Shreya', 'Kabir', 'Rhea', 'Nikhil', 'Tanvi', 'Sameer'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Agarwal', 'Joshi',
  'Mehta', 'Shah', 'Reddy', 'Nair', 'Menon', 'Desai', 'Iyer', 'Pillai',
  'Rao', 'Chopra', 'Malhotra', 'Khanna', 'Bhatia', 'Kapoor', 'Saxena', 'Jain'
];

const SERVICES = [
  { name: 'Haircut & Styling', duration: 45, price: 850, category: 'Hair' },
  { name: 'Facial Treatment', duration: 60, price: 1500, category: 'Skin' },
  { name: 'Manicure & Pedicure', duration: 60, price: 1200, category: 'Nails' },
  { name: 'Massage Therapy', duration: 60, price: 2200, category: 'Wellness' },
  { name: 'Hair Coloring', duration: 90, price: 3500, category: 'Hair' },
  { name: 'Beard Grooming & Trim', duration: 30, price: 450, category: 'Grooming' },
  { name: 'Head & Shoulder Spa', duration: 45, price: 1100, category: 'Wellness' },
  { name: 'Bridal Glow Package', duration: 120, price: 5500, category: 'Makeup' },
];

const REWARDS_DATA = [
  { name: 'Free Haircut', description: 'Complimentary haircut on your next visit', pointsCost: 300, discountVal: 850 },
  { name: '20% Off Facial', description: 'Get 20% off on any facial service', pointsCost: 500, discountVal: 300 },
  { name: 'Free Manicure', description: 'Enjoy a complimentary classic manicure', pointsCost: 400, discountVal: 600 },
  { name: 'VIP Lounge Access', description: 'Access to VIP lounge for one visit', pointsCost: 200, discountVal: 0 },
  { name: 'Product Hamper', description: 'Premium hair care product hamper worth ₹2000', pointsCost: 1000, discountVal: 2000 },
  { name: 'Free Hair Spa', description: 'Luxurious hair spa treatment free', pointsCost: 700, discountVal: 1500 },
];

async function seedTenantData(tenant: { id: string; name: string }) {
  console.log(`\n--- Seeding demo data for tenant: "${tenant.name}" (${tenant.id}) ---`);

  // 1. Ensure Loyalty Config
  const existingConfig = await prisma.loyaltyConfig.findUnique({
    where: { tenantId: tenant.id },
  });
  if (!existingConfig) {
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
  }

  // 2. Ensure Branch
  let branch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: `${tenant.name} Main Branch`,
        phone: '+91-9876543210',
        address: 'Linking Road, Bandra West',
        city: 'Mumbai',
      },
    });
  }

  // 3. Ensure Staff
  const staffCount = await prisma.staff.count({ where: { tenantId: tenant.id } });
  let staffMembers: any[] = [];
  if (staffCount === 0) {
    staffMembers = await Promise.all([
      prisma.staff.create({ data: { tenantId: tenant.id, branchId: branch.id, name: 'Priya Sharma', email: `priya@${tenant.id.slice(0, 6)}.in`, phone: '+91-9876543211', roleTitle: 'Senior Stylist', isAvailable: true } }),
      prisma.staff.create({ data: { tenantId: tenant.id, branchId: branch.id, name: 'Anita Verma', email: `anita@${tenant.id.slice(0, 6)}.in`, phone: '+91-9876543212', roleTitle: 'Facial Specialist', isAvailable: true } }),
      prisma.staff.create({ data: { tenantId: tenant.id, branchId: branch.id, name: 'Rahul Kumar', email: `rahul@${tenant.id.slice(0, 6)}.in`, phone: '+91-9876543213', roleTitle: 'Nail Technician', isAvailable: true } }),
      prisma.staff.create({ data: { tenantId: tenant.id, branchId: branch.id, name: 'Deepa Iyer', email: `deepa@${tenant.id.slice(0, 6)}.in`, phone: '+91-9876543214', roleTitle: 'Makeup Artist', isAvailable: true } }),
    ]);
  } else {
    staffMembers = await prisma.staff.findMany({ where: { tenantId: tenant.id } });
  }

  // 4. Ensure Services
  let services = await prisma.service.findMany({ where: { tenantId: tenant.id } });
  if (services.length === 0) {
    services = await Promise.all(
      SERVICES.map((s) =>
        prisma.service.create({
          data: {
            tenantId: tenant.id,
            name: s.name,
            durationMinutes: s.duration,
            price: s.price,
            category: s.category,
            pointsMultiplier: 1.0,
            isActive: true,
          },
        })
      )
    );
  }

  // 5. Ensure Membership Tiers
  let tiers = await prisma.membershipTier.findMany({ where: { tenantId: tenant.id } });
  if (tiers.length === 0) {
    tiers = await Promise.all([
      prisma.membershipTier.create({ data: { tenantId: tenant.id, name: 'SILVER', price: 0, validityDays: 365, discountPercent: 10, bonusPointsPercent: 0, priorityBooking: false, benefits: ['10% off on services', 'Birthday bonus'] } }),
      prisma.membershipTier.create({ data: { tenantId: tenant.id, name: 'GOLD', price: 999, validityDays: 365, discountPercent: 20, bonusPointsPercent: 50, priorityBooking: true, benefits: ['20% off on services', 'Free haircut every 6 months', 'Priority booking'] } }),
      prisma.membershipTier.create({ data: { tenantId: tenant.id, name: 'PLATINUM', price: 2999, validityDays: 365, discountPercent: 30, bonusPointsPercent: 100, priorityBooking: true, benefits: ['30% off on services', 'Free monthly spa', 'VIP lounge', 'Priority booking'] } }),
    ]);
  }

  // 6. Ensure Rewards
  let rewards = await prisma.reward.findMany({ where: { tenantId: tenant.id } });
  if (rewards.length === 0) {
    rewards = await Promise.all(
      REWARDS_DATA.map((r) =>
        prisma.reward.create({
          data: {
            tenantId: tenant.id,
            name: r.name,
            description: r.description,
            pointsCost: r.pointsCost,
            discountVal: r.discountVal,
            status: 'ACTIVE',
          },
        })
      )
    );
  }

  // 7. Seed Customers (if < 20)
  const currentCustCount = await prisma.customer.count({ where: { tenantId: tenant.id } });
  let customers: any[] = [];
  if (currentCustCount < 20) {
    const toCreate = 80;
    for (let i = 0; i < toCreate; i++) {
      const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lastName = LAST_NAMES[i % LAST_NAMES.length];
      const daysAgo = Math.floor(Math.random() * 90);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);
      const hasVisited = Math.random() > 0.1;
      const totalVisits = hasVisited ? Math.floor(Math.random() * 12) + 1 : 0;
      const avgSpendPerVisit = 750 + Math.random() * 1800;
      const totalSpent = Math.round(totalVisits * avgSpendPerVisit * 100) / 100;
      const lastVisitAt = hasVisited
        ? new Date(Date.now() - Math.random() * 45 * 86400000)
        : null;
      const pointsBalance = Math.floor(totalSpent / 10);

      let status: CustomerStatus = 'ACTIVE';
      if (!hasVisited || (lastVisitAt && (Date.now() - lastVisitAt.getTime()) > 60 * 86400000)) {
        status = 'INACTIVE';
      }
      if (totalSpent > 15000) status = 'ACTIVE';

      const customer = await prisma.customer.create({
        data: {
          tenantId: tenant.id,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}_${tenant.id.slice(0, 4)}@example.com`,
          phone: `+91-98${String(10000000 + i * 137).slice(0, 8)}`,
          status,
          pointsBalance,
          totalSpent,
          totalVisits,
          churnRiskScore: hasVisited ? Math.random() * 0.4 : 0.6 + Math.random() * 0.4,
          lastVisitAt,
          createdAt,
          tags: i % 4 === 0 ? ['VIP', 'Regular'] : i % 3 === 0 ? ['Regular'] : ['New'],
          notes: i % 7 === 0 ? 'Prefers weekend appointments' : null,
        },
      });
      customers.push(customer);
    }
    console.log(`Created ${customers.length} demo customers for ${tenant.name}`);
  } else {
    customers = await prisma.customer.findMany({ where: { tenantId: tenant.id }, take: 80 });
  }

  // 8. Seed Invoices & Daily Trends
  const currentInvoiceCount = await prisma.invoice.count({ where: { tenantId: tenant.id } });
  if (currentInvoiceCount < 30) {
    let invoiceCount = 0;
    const now = Date.now();

    // Create 1-3 invoices per day for the last 90 days for consistent trend lines
    for (let day = 90; day >= 0; day--) {
      const invoicesOnDay = 2 + Math.floor(Math.random() * 4);
      for (let k = 0; k < invoicesOnDay; k++) {
        invoiceCount++;
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const invoiceDate = new Date(now - day * 86400000 + Math.floor(Math.random() * 36000000));
        const qty = 1;
        const subtotal = service.price;
        const discount = Math.random() > 0.8 ? Math.round(subtotal * 0.1) : 0;
        const tax = Math.round((subtotal - discount) * 0.18);
        const total = subtotal - discount + tax;

        await prisma.invoice.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            invoiceNumber: `INV-${tenant.id.slice(0, 3).toUpperCase()}-${String(invoiceCount).padStart(4, '0')}`,
            subtotal,
            discount,
            tax,
            total,
            status: 'PAID',
            paymentMethod: ['UPI', 'CARD', 'CASH'][Math.floor(Math.random() * 3)],
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
    console.log(`Created ${invoiceCount} invoices across last 90 days for ${tenant.name}`);
  }

  // 9. Seed Appointments
  const apptCount = await prisma.appointment.count({ where: { tenantId: tenant.id } });
  if (apptCount < 20) {
    let createdAppts = 0;
    for (let day = 30; day >= -7; day--) {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let j = 0; j < count; j++) {
        createdAppts++;
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        const staff = staffMembers[Math.floor(Math.random() * staffMembers.length)];
        const startTime = new Date(Date.now() - day * 86400000);
        startTime.setHours(10 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15, 0, 0);
        const endTime = new Date(startTime.getTime() + service.durationMinutes * 60000);

        let status: AppointmentStatus = 'COMPLETED';
        if (day <= 0) {
          status = day === 0 ? 'CONFIRMED' : 'BOOKED';
        } else if (Math.random() < 0.1) {
          status = 'CANCELLED';
        }

        await prisma.appointment.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            staffId: staff.id,
            serviceName: service.name,
            startTime,
            endTime,
            status,
            notes: Math.random() > 0.8 ? 'Customer requested quiet session' : null,
          },
        });
      }
    }
    console.log(`Created ${createdAppts} appointments for ${tenant.name}`);
  }

  // 10. Seed Points Ledger & Activities
  const ledgerCount = await prisma.pointsLedger.count({ where: { tenantId: tenant.id } });
  if (ledgerCount < 15) {
    for (const cust of customers.slice(0, 30)) {
      if (cust.pointsBalance > 0) {
        await prisma.pointsLedger.create({
          data: {
            tenantId: tenant.id,
            customerId: cust.id,
            amount: cust.pointsBalance,
            balanceAfter: cust.pointsBalance,
            reason: 'Earned from completed visits and services',
          },
        });
      }
    }
  }

  console.log(`✓ Tenant "${tenant.name}" is fully seeded with demo data.`);
}

async function main() {
  console.log('Seeding Doloyal database...');

  // 1. Help articles
  await seedHelpArticles();

  // 2. Ensure demo user exists
  let demoUser = await prisma.user.findFirst({
    where: {
      OR: [{ clerkId: 'dev-user' }, { email: 'demo@doloyal.ai' }],
    },
  });

  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        clerkId: 'dev-user',
        email: 'demo@doloyal.ai',
        firstName: 'Demo',
        lastName: 'User',
      },
    });
    console.log('Created demo user (demo@doloyal.ai)');
  }

  // 3. Find all tenants in the system
  let tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) {
    const newTenant = await prisma.tenant.create({
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
        taxRate: 18,
        onboardingComplete: true,
      },
    });
    await prisma.membership.create({
      data: { userId: demoUser.id, tenantId: newTenant.id, role: 'OWNER' },
    });
    tenants = [newTenant];
  }

  // 4. Seed all tenants
  for (const t of tenants) {
    await seedTenantData(t);
  }

  console.log('\n=============================================');
  console.log('All tenants have been successfully seeded with demo data!');
  console.log('=============================================\n');
}

/** Idempotent help-article seed */
async function seedHelpArticles() {
  const count = HELP_ARTICLES.length;
  let upserted = 0;
  for (const article of HELP_ARTICLES) {
    await prisma.supportArticle.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        description: article.description,
        content: article.content,
        category: article.category,
        keywords: article.keywords,
        faq: article.faq,
        sortOrder: article.sortOrder,
        published: true,
      },
      create: {
        slug: article.slug,
        title: article.title,
        description: article.description,
        content: article.content,
        category: article.category,
        keywords: article.keywords,
        faq: article.faq,
        sortOrder: article.sortOrder,
        published: true,
      },
    });
    upserted++;
  }
  console.log(`Seeded ${upserted}/${count} help articles`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
