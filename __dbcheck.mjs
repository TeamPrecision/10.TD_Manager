import { PrismaClient } from '@prisma/client';
import path from 'path';

const dbPath = path.resolve('./prisma/dev.db').split(path.sep).join('/');
const url = 'file:' + dbPath;
console.log('db url:', url);

const p = new PrismaClient({ datasources: { db: { url } } });

const findFirst = await p.user.findFirst({ where: { email: 'leader@td.local' } });
console.log('findFirst:', findFirst ? findFirst.email : 'NULL');

const findUnique = await p.user.findUnique({ where: { email: 'leader@td.local' } });
console.log('findUnique:', findUnique ? findUnique.email : 'NULL');

const raw = await p.$queryRaw`SELECT email, length(email) as len, hex(email) as hexval FROM User WHERE email LIKE 'leader%'`;
console.log('raw:', JSON.stringify(raw));

await p.$disconnect();
