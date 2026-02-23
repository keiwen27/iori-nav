// functions/_middleware.js

import { DB_SCHEMA, SCHEMA_VERSION } from './constants';

export function normalizeSortOrder(val) {
  const num = Number(val);
  return Number.isFinite(num) ? num : 9999;
}

export function isSubmissionEnabled(env) {
  // Convert to string to handle both boolean `true` from toml and string 'true' from secrets
  return String(env.ENABLE_PUBLIC_SUBMISSION) === 'true';
}

export async function isAdminAuthenticated(request, env) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return false;

  const match = cookie.match(/admin_session=([^;]+)/);
  if (!match) return false;

  const token = match[1];
  const session = await env.NAV_AUTH.get(`session_${token}`);

  return Boolean(session);
}

export function errorResponse(message, status) {
  return new Response(JSON.stringify({ code: status, message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function clearHomeCache(env) {
  try {
    await Promise.all([
      env.NAV_AUTH.delete('home_html_public'),
      env.NAV_AUTH.delete('home_html_private')
    ]);
  } catch (e) {
    console.error('Failed to clear home cache:', e);
  }
}

/**
 * 构建 session cookie 字符串
 * @param {string} token - session token
 * @param {object} options - { maxAge: number }
 */
export function buildSessionCookie(token, options = {}) {
  const maxAge = options.maxAge !== undefined ? options.maxAge : 86400;
  return `admin_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

/**
 * 从请求 Cookie 中提取 session token
 * @returns {string|null}
 */
export function getSessionToken(request) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  const match = cookie.match(/admin_session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * 恒定时间字符串比较，防止时序攻击
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) {
    // 长度不同时仍需做一次完整比较以保持恒定时间
    const dummy = new Uint8Array(bufA.byteLength);
    crypto.subtle.timingSafeEqual(bufA, dummy);
    return false;
  }
  return crypto.subtle.timingSafeEqual(bufA, bufB);
}

/**
 * 通用 IP 速率限制（基于 KV 计数器 + TTL 自动过期）
 * @param {object} env - Cloudflare env（需要 NAV_AUTH KV 绑定）
 * @param {string} key - 速率限制键名（通常含 IP）
 * @param {number} maxRequests - 窗口期内最大请求数
 * @param {number} windowSeconds - 窗口期（秒）
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
export async function checkRateLimit(env, key, maxRequests, windowSeconds) {
  try {
    const current = await env.NAV_AUTH.get(key);
    const count = current ? parseInt(current, 10) : 0;
    if (count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    await env.NAV_AUTH.put(key, String(count + 1), { expirationTtl: windowSeconds });
    return { allowed: true, remaining: maxRequests - count - 1 };
  } catch (e) {
    console.error('Rate limit check failed:', e);
    // 速率限制检查失败时不阻塞正常请求
    return { allowed: true, remaining: maxRequests };
  }
}

/**
 * 登录暴力破解防护（基于 IP 的失败计数器）
 * @param {object} env - Cloudflare env
 * @param {string} ip - 客户端 IP
 * @param {number} maxAttempts - 最大允许失败次数
 * @param {number} lockoutSeconds - 锁定时间（秒）
 * @returns {Promise<{locked: boolean, attemptsLeft: number}>}
 */
export async function checkLoginRateLimit(env, ip, maxAttempts, lockoutSeconds) {
  const key = `login_fail_${ip}`;
  try {
    const current = await env.NAV_AUTH.get(key);
    const count = current ? parseInt(current, 10) : 0;
    if (count >= maxAttempts) {
      return { locked: true, attemptsLeft: 0 };
    }
    return { locked: false, attemptsLeft: maxAttempts - count };
  } catch (e) {
    console.error('Login rate limit check failed:', e);
    return { locked: false, attemptsLeft: maxAttempts };
  }
}

/**
 * 记录一次登录失败
 */
export async function recordLoginFailure(env, ip, maxAttempts, lockoutSeconds) {
  const key = `login_fail_${ip}`;
  try {
    const current = await env.NAV_AUTH.get(key);
    const count = current ? parseInt(current, 10) : 0;
    await env.NAV_AUTH.put(key, String(count + 1), { expirationTtl: lockoutSeconds });
  } catch (e) {
    console.error('Record login failure failed:', e);
  }
}

/**
 * 清除登录失败计数（登录成功时调用）
 */
export async function clearLoginFailures(env, ip) {
  const key = `login_fail_${ip}`;
  try {
    await env.NAV_AUTH.delete(key);
  } catch (e) {
    // 忽略清除失败
  }
}

// DB_SCHEMA and SCHEMA_VERSION are imported from constants.js

let dbInitialized = false;

async function initializeDb(db, kv) {
  if (dbInitialized) return;

  // 检查 KV 缓存，如果已经迁移过，说明表结构已就绪，跳过初始化
  if (kv) {
    try {
      const migrated = await kv.get(`schema_migrated_${SCHEMA_VERSION}`);
      if (migrated) {
        dbInitialized = true;
        return;
      }
    } catch (e) {
      // KV 读取失败不应阻塞，继续尝试数据库初始化
      console.warn("KV check failed:", e);
    }
  }

  try {
    console.log("Initializing database...");
    const statements = DB_SCHEMA.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const preparedStatements = statements.map(stmt => db.prepare(stmt));

    await db.batch(preparedStatements);

    // 3. 标记初始化完成
    dbInitialized = true;
    if (kv) {
      // 标记迁移完成（永久缓存，直到 SCHEMA_VERSION 变更）
      await kv.put(`db_init_${SCHEMA_VERSION}`, 'true');
      // 同时写入 schema_migrated 标记，避免 index.js 重复检查
      await kv.put(`schema_migrated_${SCHEMA_VERSION}`, 'true');
    }
    console.log("Database initialized successfully.");
  } catch (e) {
    console.error("Database initialization failed:", e);
    // 初始化失败时,我们只记录错误并继续,以防影响正常请求
  }
}

// 导出中间件(可选,用于添加全局逻辑)
export async function onRequest(context) {
  // 在每个请求开始时检查并初始化数据库
  if (context.env.NAV_DB) {
    await initializeDb(context.env.NAV_DB, context.env.NAV_AUTH);
  }

  // 在这里可以添加全局中间件逻辑
  // 例如: 日志记录、CORS 头等
  return context.next();
}
