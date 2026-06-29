import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding...');

  // -------------------------------------------------------------
  // 1. CREATE PERMISSIONS
  // -------------------------------------------------------------
  const permissionNames = [
    // Hospital permissions
    'hospitals:read', 'hospitals:write',
    // Department permissions
    'departments:read', 'departments:write',
    // User permissions
    'users:read', 'users:write',
    // Patient permissions
    'patients:read', 'patients:write',
    // Assessment permissions
    'assessments:read', 'assessments:write',
    // Prediction permissions
    'predictions:read', 'predictions:write',
    // Document permissions
    'documents:read', 'documents:write',
    // Audit permissions
    'audit_logs:read',
    // Notification permissions
    'notifications:read', 'notifications:write',
  ];

  const permissions: Record<string, any> = {};
  for (const name of permissionNames) {
    permissions[name] = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description: `Allows action ${name}`,
      },
    });
  }
  console.log(`✅ Upserted ${Object.keys(permissions).length} Permissions.`);

  // -------------------------------------------------------------
  // 2. CREATE ROLES & ASSIGN PERMISSIONS
  // -------------------------------------------------------------
  const roleSpecs = [
    {
      name: 'SUPER_ADMIN',
      description: 'Global administrator with complete access across all hospitals',
      permissionKeys: permissionNames, // All permissions
    },
    {
      name: 'HOSPITAL_ADMIN',
      description: 'Hospital-level administrator managing departments, staff, and patients',
      permissionKeys: [
        'departments:read', 'departments:write',
        'users:read', 'users:write',
        'patients:read', 'patients:write',
        'assessments:read', 'assessments:write',
        'predictions:read',
        'documents:read', 'documents:write',
        'audit_logs:read',
        'notifications:read', 'notifications:write',
      ],
    },
    {
      name: 'DOCTOR',
      description: 'Clinical provider managing patient health records, logging assessments, and triggering predictions',
      permissionKeys: [
        'departments:read',
        'users:read',
        'patients:read', 'patients:write',
        'assessments:read', 'assessments:write',
        'predictions:read', 'predictions:write',
        'documents:read', 'documents:write',
        'notifications:read', 'notifications:write',
      ],
    },
    {
      name: 'NURSE',
      description: 'Clinical assistant updating vitals, visit records, and logging initial assessments',
      permissionKeys: [
        'departments:read',
        'patients:read', 'patients:write',
        'assessments:read', 'assessments:write',
        'documents:read', 'documents:write',
        'notifications:read', 'notifications:write',
      ],
    },
    {
      name: 'DATA_ANALYST',
      description: 'Analytical user with access to reporting, dashboards, and prediction trends',
      permissionKeys: [
        'patients:read',
        'assessments:read',
        'predictions:read',
        'notifications:read',
      ],
    },
  ];

  const roles: Record<string, any> = {};
  for (const spec of roleSpecs) {
    roles[spec.name] = await prisma.role.upsert({
      where: { name: spec.name },
      update: {
        permissions: {
          set: spec.permissionKeys.map((k) => ({ id: permissions[k].id })),
        },
      },
      create: {
        name: spec.name,
        description: spec.description,
        permissions: {
          connect: spec.permissionKeys.map((k) => ({ id: permissions[k].id })),
        },
      },
    });
  }
  console.log(`✅ Upserted ${Object.keys(roles).length} Roles.`);

  // -------------------------------------------------------------
  // 3. CREATE HOSPITALS (TENANTS)
  // -------------------------------------------------------------
  const hospital1 = await prisma.hospital.upsert({
    where: { slug: 'metro-general' },
    update: {},
    create: {
      name: 'Metro General Hospital',
      slug: 'metro-general',
      status: 'ACTIVE',
    },
  });

  const hospital2 = await prisma.hospital.upsert({
    where: { slug: 'st-jude' },
    update: {},
    create: {
      name: 'St. Jude Children Hospital',
      slug: 'st-jude',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Upserted 2 Hospitals (Tenants): "metro-general", "st-jude".');

  // -------------------------------------------------------------
  // 4. CREATE DEPARTMENTS
  // -------------------------------------------------------------
  const cardiology = await prisma.department.create({
    data: {
      name: 'Cardiology',
      description: 'Department dealing with heart disorders',
      hospitalId: hospital1.id,
    },
  });

  const endocrinology = await prisma.department.create({
    data: {
      name: 'Endocrinology',
      description: 'Department dealing with endocrine system and diabetes',
      hospitalId: hospital1.id,
    },
  });
  console.log('✅ Created Departments inside Metro General.');

  // -------------------------------------------------------------
  // 5. CREATE USERS
  // -------------------------------------------------------------
  const defaultPassword = 'password123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // A. Super Admin (Global scope)
  await prisma.user.upsert({
    where: { email: 'superadmin@pulseflow.ai' },
    update: {},
    create: {
      email: 'superadmin@pulseflow.ai',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Mercer',
      roleId: roles['SUPER_ADMIN'].id,
      status: 'ACTIVE',
    },
  });

  // B. Metro General Admin
  await prisma.user.upsert({
    where: { email: 'admin@metro.org' },
    update: {},
    create: {
      email: 'admin@metro.org',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      roleId: roles['HOSPITAL_ADMIN'].id,
      hospitalId: hospital1.id,
      status: 'ACTIVE',
    },
  });

  // C. Metro General Doctor (Cardiology)
  await prisma.user.upsert({
    where: { email: 'doctor@metro.org' },
    update: {},
    create: {
      email: 'doctor@metro.org',
      passwordHash,
      firstName: 'Gregory',
      lastName: 'House',
      roleId: roles['DOCTOR'].id,
      hospitalId: hospital1.id,
      departmentId: cardiology.id,
      status: 'ACTIVE',
    },
  });

  // D. Metro General Nurse (Cardiology)
  await prisma.user.upsert({
    where: { email: 'nurse@metro.org' },
    update: {},
    create: {
      email: 'nurse@metro.org',
      passwordHash,
      firstName: 'Abby',
      lastName: 'Lockhart',
      roleId: roles['NURSE'].id,
      hospitalId: hospital1.id,
      departmentId: cardiology.id,
      status: 'ACTIVE',
    },
  });

  // E. Metro General Analyst
  await prisma.user.upsert({
    where: { email: 'analyst@metro.org' },
    update: {},
    create: {
      email: 'analyst@metro.org',
      passwordHash,
      firstName: 'Grace',
      lastName: 'Hopper',
      roleId: roles['DATA_ANALYST'].id,
      hospitalId: hospital1.id,
      status: 'ACTIVE',
    },
  });

  // F. St Jude Admin
  await prisma.user.upsert({
    where: { email: 'admin@stjude.org' },
    update: {},
    create: {
      email: 'admin@stjude.org',
      passwordHash,
      firstName: 'John',
      lastName: 'Watson',
      roleId: roles['HOSPITAL_ADMIN'].id,
      hospitalId: hospital2.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created User Accounts.');
  console.log('✨ Seeding Completed Successfully! All default login passwords: "password123"');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
