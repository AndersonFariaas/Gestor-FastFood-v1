const { z } = require('zod');

// Erro "esperado": a mensagem é segura para mostrar ao usuário.
class AppError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

function toErrorResponse(err) {
    if (err instanceof AppError) return { ok: false, code: err.code, message: err.message };
    if (err instanceof z.ZodError) {
        const field = err.issues[0]?.path.join('.') || 'payload';
        return { ok: false, code: 'INVALID_INPUT', message: `Dados inválidos (${field}).` };
    }
    console.error('❌ Erro inesperado:', err);
    return { ok: false, code: 'INTERNAL', message: 'Erro interno no servidor.' };
}

module.exports = { AppError, toErrorResponse };
