import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const superAdminPassword = await bcrypt.hash('superadmin123', 10)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@giftbox.lk' },
    update: {},
    create: {
      email: 'superadmin@giftbox.lk',
      name: 'Super Admin',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
  })

  const customPassword = await bcrypt.hash('1Qaz2Wsx@', 10)

  const superAdmin1 = await prisma.user.upsert({
    where: { email: 'sarath@mail.com' },
    update: {
      password: customPassword,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'sarath@mail.com',
      name: 'Sarath Admin',
      password: customPassword,
      role: 'SUPER_ADMIN',
    },
  })

  const superAdmin2 = await prisma.user.upsert({
    where: { email: 'osarath@mail.com' },
    update: {
      password: customPassword,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'osarath@mail.com',
      name: 'Sarath Admin Typo 1',
      password: customPassword,
      role: 'SUPER_ADMIN',
    },
  })

  const superAdmin3 = await prisma.user.upsert({
    where: { email: 'sarath2mail.com' },
    update: {
      password: customPassword,
      role: 'SUPER_ADMIN',
    },
    create: {
      email: 'sarath2mail.com',
      name: 'Sarath Admin Typo 2',
      password: customPassword,
      role: 'SUPER_ADMIN',
    },
  })

  const devAdminPassword = await bcrypt.hash('devadmin123', 10)

  const devAdmin = await prisma.user.upsert({
    where: { email: 'devadmin@giftbox.lk' },
    update: {},
    create: {
      email: 'devadmin@giftbox.lk',
      name: 'Dev Admin',
      password: devAdminPassword,
      role: 'DEV_ADMIN',
    },
  })

  console.log({ superAdmin, superAdmin1, superAdmin2, superAdmin3, devAdmin })

  // Seed Sri Lankan Provinces & Cities
  const locations = [
    {
      province: "Western Province",
      cities: [
        { name: "Colombo", fee: 250 },
        { name: "Gampaha", fee: 350 },
        { name: "Negombo", fee: 350 },
        { name: "Kalutara", fee: 400 },
        { name: "Mount Lavinia", fee: 300 }
      ]
    },
    {
      province: "Central Province",
      cities: [
        { name: "Kandy", fee: 400 },
        { name: "Matale", fee: 450 },
        { name: "Nuwara Eliya", fee: 500 }
      ]
    },
    {
      province: "Southern Province",
      cities: [
        { name: "Galle", fee: 400 },
        { name: "Matara", fee: 450 },
        { name: "Hambantota", fee: 500 }
      ]
    },
    {
      province: "Northern Province",
      cities: [
        { name: "Jaffna", fee: 500 },
        { name: "Vavuniya", fee: 450 }
      ]
    },
    {
      province: "Eastern Province",
      cities: [
        { name: "Trincomalee", fee: 450 },
        { name: "Batticaloa", fee: 450 }
      ]
    },
    {
      province: "North Western Province",
      cities: [
        { name: "Kurunegala", fee: 400 },
        { name: "Chilaw", fee: 400 }
      ]
    },
    {
      province: "North Central Province",
      cities: [
        { name: "Anuradhapura", fee: 450 },
        { name: "Polonnaruwa", fee: 450 }
      ]
    },
    {
      province: "Uva Province",
      cities: [
        { name: "Badulla", fee: 450 },
        { name: "Bandarawela", fee: 450 }
      ]
    },
    {
      province: "Sabaragamuwa Province",
      cities: [
        { name: "Ratnapura", fee: 400 },
        { name: "Kegalle", fee: 400 }
      ]
    }
  ]

  for (const loc of locations) {
    const prov = await prisma.province.upsert({
      where: { name: loc.province },
      update: {},
      create: { name: loc.province, isActive: true }
    })

    for (const city of loc.cities) {
      await prisma.city.upsert({
        where: {
          name_provinceId: {
            name: city.name,
            provinceId: prov.id
          }
        },
        update: {
          fee: city.fee
        },
        create: {
          name: city.name,
          fee: city.fee,
          provinceId: prov.id,
          isActive: true
        }
      })
    }
  }

  console.log("Seeded Sri Lankan provinces and cities successfully.")

  const featureToggleKeys = [
    'giftboxes_available',
    'storefront_website_enabled',
    'storefront_section',
    'storefront_banners',
    'storefront_occasions',
    'storefront_recipients',
    'storefront_discounts',
    'storefront_giftcards',
    'storefront_wrapping',
    'operations_section',
    'operations_reviews',
    'operations_returns',
    'operations_suppliers',
    'operations_shipping',
  ]

  for (const key of featureToggleKeys) {
    await prisma.featureToggle.upsert({
      where: { key },
      update: {},
      create: {
        key,
        isActive: true,
      },
    })
  }

  console.log("Seeded default feature toggles successfully.")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
