import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ADMIN_PASSWORD, createTestContext, OPERATOR_PASSWORD, type TestContext } from './helpers.ts';

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestContext();
});
afterAll(() => ctx.close());

describe('autenticação', () => {
  it('não diferencia usuário inexistente de senha errada', async () => {
    const wrongPass = await request(ctx.server)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'x' });
    const noUser = await request(ctx.server)
      .post('/api/auth/login')
      .send({ username: 'ninguem', password: 'x' });
    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body.message).toBe(noUser.body.message);
  });

  it('define cookie httpOnly e SameSite=Strict e nunca devolve o hash da senha', async () => {
    const res = await request(ctx.server)
      .post('/api/auth/login')
      .send({ username: 'admin', password: `${ADMIN_PASSWORD}-nova` })
      .expect(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/HttpOnly.*SameSite=Strict/);
    expect(JSON.stringify(res.body)).not.toMatch(/password|\$2[aby]\$/);
  });

  it('rejeita payload inválido com 400', async () => {
    await request(ctx.server).post('/api/auth/login').send({ username: 'admin' }).expect(400);
    await request(ctx.server)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{quebrado')
      .expect(400);
  });

  it('exige sessão nas rotas de negócio', async () => {
    await request(ctx.server).get('/api/products').expect(401);
    await request(ctx.server).get('/api/products').set('Cookie', 'sid=forjado').expect(401);
  });

  it('com senha provisória, bloqueia tudo exceto a troca de senha', async () => {
    await ctx.admin.agent
      .post('/api/users')
      .send({ username: 'novato', password: 'provisoria-123', role: 'operator' })
      .expect(201);
    const agent = request.agent(ctx.server);
    const login = await agent
      .post('/api/auth/login')
      .send({ username: 'novato', password: 'provisoria-123' });
    expect(login.body.user.mustChangePassword).toBe(true);

    const blocked = await agent.get('/api/products').expect(403);
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');

    await agent
      .post('/api/auth/change-password')
      .send({ currentPassword: 'errada', newPassword: 'nova-senha-123' })
      .expect(400);
    await agent
      .post('/api/auth/change-password')
      .send({ currentPassword: 'provisoria-123', newPassword: 'nova-senha-123' })
      .expect(200);
    await agent.get('/api/products').expect(200);
  });

  it('logout invalida a sessão', async () => {
    const { agent } = await ctx.agentFor('operador', `${OPERATOR_PASSWORD}-nova`);
    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('bloqueia força bruta após 5 tentativas', async () => {
    let last = 0;
    for (let i = 0; i < 6; i++) {
      last = (
        await request(ctx.server)
          .post('/api/auth/login')
          .send({ username: 'novato', password: `chute${i}` })
      ).status;
    }
    expect(last).toBe(429);
    const ok = await request(ctx.server)
      .post('/api/auth/login')
      .send({ username: 'novato', password: 'nova-senha-123' });
    expect(ok.status).toBe(429);
  });
});

describe('permissões por perfil', () => {
  it('operador não gerencia cardápio, usuários nem caixa', async () => {
    const op = ctx.operator.agent;
    await op.post('/api/products').send({ name: 'X', priceCents: 100, category: 'Y' }).expect(403);
    await op.delete('/api/products/qualquer').expect(403);
    await op.get('/api/users').expect(403);
    await op.post('/api/users').send({ username: 'hacker', password: '12345678', role: 'admin' }).expect(403);
    await op.get('/api/shifts/current').expect(403);
    await op.post('/api/shifts/current/close').expect(403);
  });

  it('não existe cadastro público de usuários', async () => {
    // Rotas desconhecidas também exigem sessão: anônimo recebe 401, logado recebe 404.
    await request(ctx.server).post('/api/auth/register').send({ username: 'x', password: 'y' }).expect(401);
    await ctx.admin.agent.post('/api/auth/register').send({ username: 'x', password: 'y' }).expect(404);
  });

  it('não permite remover o último gerente nem a si mesmo', async () => {
    const users = (await ctx.admin.agent.get('/api/users').expect(200)).body as {
      id: string;
      username: string;
    }[];
    const adminId = users.find((u) => u.username === 'admin')!.id;
    await ctx.admin.agent.delete(`/api/users/${adminId}`).expect(400);
    await ctx.admin.agent.patch(`/api/users/${adminId}`).send({ role: 'operator' }).expect(400);
  });
});
