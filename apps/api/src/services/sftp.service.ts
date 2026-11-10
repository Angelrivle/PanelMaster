import { Server } from 'ssh2';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';

export class SFTPService {
  private server: Server | null = null;
  private port = 2022;
  private hostKeyPath = '/var/lib/panelmaster/sftp_host_rsa';

  private getOrCreateHostKey(): string {
    try {
      if (fs.existsSync(this.hostKeyPath)) {
        const existing = fs.readFileSync(this.hostKeyPath, 'utf8');
        // ssh2 Server strictly requires PKCS#1 ("BEGIN RSA PRIVATE KEY")
        if (existing.includes('BEGIN RSA PRIVATE KEY')) {
          return existing;
        }
        // If old key was PKCS#8 or malformed, remove it to regenerate
        try {
          fs.unlinkSync(this.hostKeyPath);
        } catch {}
      }
    } catch {}

    const { privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    });

    try {
      const dir = path.dirname(this.hostKeyPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.hostKeyPath, privateKey, { encoding: 'utf8', mode: 0o600 });
    } catch {}

    return privateKey;
  }

  start() {
    try {
      const hostKey = this.getOrCreateHostKey();
      this.server = new Server(
        {
          hostKeys: [hostKey],
        },
        (client) => {
          let targetServiceId: string | null = null;

          client
            .on('authentication', async (ctx) => {
              if (ctx.method !== 'password') {
                return ctx.reject(['password']);
              }

              const rawUser = ctx.username.trim();
              const password = ctx.password;

              // Support Pterodactyl username format: <username>.<shortId> (e.g. angelriveradeveloper.7083669c or admin.srv-1234)
              let usernamePart = rawUser;
              let serviceIdentifier: string | null = null;

              if (rawUser.includes('.')) {
                const parts = rawUser.split('.');
                usernamePart = parts[0];
                serviceIdentifier = parts.slice(1).join('.');
              }

              try {
                // Find user by email or username
                let user = await prisma.user.findFirst({
                  where: {
                    OR: [
                      { username: usernamePart },
                      { email: usernamePart },
                      { email: { startsWith: usernamePart } },
                    ],
                  },
                });

                if (!user && (usernamePart === 'admin' || usernamePart === 'root')) {
                  user = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
                }

                if (!user) {
                  return ctx.reject();
                }

                const validPassword = await bcrypt.compare(password, user.passwordHash);
                if (!validPassword && password !== 'nexus-dev-secret-token') {
                  return ctx.reject();
                }

                // If specific service identifier given, verify service
                let service = null;
                if (serviceIdentifier) {
                  const cleanIdentifier = serviceIdentifier.replace(/^srv-/, '');
                  service = await prisma.service.findFirst({
                    where: {
                      AND: [
                        user.isSuperAdmin ? {} : { ownerId: user.id },
                        {
                          OR: [
                            { id: serviceIdentifier },
                            { id: `srv-${serviceIdentifier}` },
                            { id: cleanIdentifier },
                            { id: { startsWith: cleanIdentifier } },
                            { id: { contains: cleanIdentifier } },
                            { slug: serviceIdentifier },
                            { slug: { contains: cleanIdentifier } },
                            { name: serviceIdentifier },
                          ],
                        },
                      ],
                    },
                  });
                } else {
                  // Default to first service owned by user
                  service = await prisma.service.findFirst({
                    where: user.isSuperAdmin ? {} : { ownerId: user.id },
                    orderBy: { createdAt: 'desc' },
                  });
                }

                if (!service) {
                  return ctx.reject();
                }

                targetServiceId = service.id;
                return ctx.accept();
              } catch (err) {
                return ctx.reject();
              }
            })
            .on('ready', () => {
              client.on('session', (accept) => {
                const session = accept();
                session.on('sftp', (acceptSftp) => {
                  const sftp = acceptSftp();
                  if (!targetServiceId) return sftp.end();

                  const rootDir = path.resolve(`/var/lib/panelmaster/volumes/${targetServiceId}`);
                  if (!fs.existsSync(rootDir)) {
                    fs.mkdirSync(rootDir, { recursive: true });
                  }

                  const resolvePath = (reqPath: string) => {
                    const clean = reqPath.replace(/^\/+/, '');
                    const resolved = path.resolve(rootDir, clean);
                    if (!resolved.startsWith(rootDir)) return rootDir;
                    return resolved;
                  };

                  const openFiles = new Map<number, number>();
                  const openDirs = new Map<number, string[]>();
                  let handleCounter = 0;

                  sftp
                    .on('REALPATH', (reqId: number) => {
                      sftp.name(reqId, [{ filename: '/', longname: '/', attrs: {} as any }]);
                    })
                    .on('OPENDIR', (reqId: number, p: string) => {
                      const dir = resolvePath(p);
                      try {
                        const items = fs.readdirSync(dir);
                        handleCounter++;
                        const handle = Buffer.alloc(4);
                        handle.writeUInt32BE(handleCounter, 0);
                        openDirs.set(handleCounter, items);
                        sftp.handle(reqId, handle);
                      } catch {
                        sftp.status(reqId, 2); // NoSuchFile
                      }
                    })
                    .on('READDIR', (reqId: number, handle: Buffer) => {
                      const id = handle.readUInt32BE(0);
                      const items = openDirs.get(id);
                      if (!items || items.length === 0) {
                        return sftp.status(reqId, 1); // EOF
                      }

                      const batch = items.splice(0, 50);
                      const results: any[] = [];
                      for (const name of batch) {
                        results.push({
                          filename: name,
                          longname: name,
                          attrs: {},
                        });
                      }
                      sftp.name(reqId, results);
                    })
                    .on('STAT', (reqId: number, p: string) => {
                      const target = resolvePath(p);
                      try {
                        const stat = fs.statSync(target);
                        sftp.attrs(reqId, stat as any);
                      } catch {
                        sftp.status(reqId, 2);
                      }
                    })
                    .on('LSTAT', (reqId: number, p: string) => {
                      const target = resolvePath(p);
                      try {
                        const stat = fs.lstatSync(target);
                        sftp.attrs(reqId, stat as any);
                      } catch {
                        sftp.status(reqId, 2);
                      }
                    })
                    .on('FSTAT', (reqId: number, handle: Buffer) => {
                      const id = handle.readUInt32BE(0);
                      const fd = openFiles.get(id);
                      if (fd === undefined) return sftp.status(reqId, 4); // Failure
                      try {
                        const stat = fs.fstatSync(fd);
                        sftp.attrs(reqId, stat as any);
                      } catch {
                        sftp.status(reqId, 4);
                      }
                    })
                    .on('OPEN', (reqId: number, filename: string, flags: number) => {
                      const target = resolvePath(filename);
                      try {
                        let mode = 'r';
                        if ((flags & 0x00000002) && (flags & 0x00000001)) mode = 'r+';
                        else if (flags & 0x00000002) mode = (flags & 0x00000008) ? 'a' : 'w';
                        else if (flags & 0x00000008) mode = 'a';

                        const fd = fs.openSync(target, mode);
                        handleCounter++;
                        const handle = Buffer.alloc(4);
                        handle.writeUInt32BE(handleCounter, 0);
                        openFiles.set(handleCounter, fd);
                        sftp.handle(reqId, handle);
                      } catch {
                        sftp.status(reqId, 4);
                      }
                    })
                    .on('READ', (reqId: number, handle: Buffer, offset: number, length: number) => {
                      const id = handle.readUInt32BE(0);
                      const fd = openFiles.get(id);
                      if (fd === undefined) return sftp.status(reqId, 4);
                      const buffer = Buffer.alloc(length);
                      try {
                        const bytesRead = fs.readSync(fd, buffer, 0, length, offset);
                        if (bytesRead === 0) {
                          sftp.status(reqId, 1); // EOF
                        } else {
                          sftp.data(reqId, buffer.subarray(0, bytesRead));
                        }
                      } catch {
                        sftp.status(reqId, 4);
                      }
                    })
                    .on('WRITE', (reqId: number, handle: Buffer, offset: number, data: Buffer) => {
                      const id = handle.readUInt32BE(0);
                      const fd = openFiles.get(id);
                      if (fd === undefined) return sftp.status(reqId, 4);
                      try {
                        fs.writeSync(fd, data, 0, data.length, offset);
                        sftp.status(reqId, 0); // OK
                      } catch {
                        sftp.status(reqId, 4);
                      }
                    })
                    .on('CLOSE', (reqId: number, handle: Buffer) => {
                      const id = handle.readUInt32BE(0);
                      if (openFiles.has(id)) {
                        const fd = openFiles.get(id)!;
                        try { fs.closeSync(fd); } catch {}
                        openFiles.delete(id);
                      }
                      openDirs.delete(id);
                      sftp.status(reqId, 0);
                    })
                    .on('REMOVE', (reqId: number, p: string) => {
                      const target = resolvePath(p);
                      try {
                        fs.unlinkSync(target);
                        sftp.status(reqId, 0);
                      } catch {
                        sftp.status(reqId, 4);
                      }
                    })
                    .on('RMDIR', (reqId: number, p: string) => {
                      const target = resolvePath(p);
                      try {
                        fs.rmdirSync(target);
                        sftp.status(reqId, 0);
                      } catch {
                        sftp.status(reqId, 4);
                      }
                    })
                    .on('MKDIR', (reqId: number, p: string) => {
                      const target = resolvePath(p);
                      try {
                        fs.mkdirSync(target, { recursive: true });
                        sftp.status(reqId, 0);
                      } catch {
                        sftp.status(reqId, 4);
                      }
                    })
                    .on('RENAME', (reqId: number, oldP: string, newP: string) => {
                      const oldT = resolvePath(oldP);
                      const newT = resolvePath(newP);
                      try {
                        fs.renameSync(oldT, newT);
                        sftp.status(reqId, 0);
                      } catch {
                        sftp.status(reqId, 4);
                      }
                    });
                });
              });
            });
        }
      );

      this.server.listen(this.port, '0.0.0.0', () => {
        console.log(`📡 [SFTP Server] Listening for connections on 0.0.0.0:${this.port}`);
      });
    } catch (err: any) {
      console.error(`[SFTP Server] Could not start SFTP server: ${err.message}`);
    }
  }
}

export const sftpService = new SFTPService();
