import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query', 'error', 'warn']
  })
}

/* eslint-disable no-var */
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}
/* eslint-enable no-var */

const prisma: ReturnType<typeof prismaClientSingleton> = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma