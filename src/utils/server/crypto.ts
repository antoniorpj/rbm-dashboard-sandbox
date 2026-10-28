import "server-only";
import {
	createHash,
	createHmac,
	randomBytes,
	timingSafeEqual as nodeTimingSafeEqual,
} from "node:crypto";

export function sha256(text: string) {
	return createHash("sha256").update(text, "utf8").digest("hex");
}

export function hmacSha256(key: string, msg: string) {
	return createHmac("sha256", key).update(msg, "utf8").digest("hex");
}

export function randomHex(bytes = 16) {
	return randomBytes(bytes).toString("hex");
}

/**
 * timingSafeEqual que não vaza timing e lida com buffers de tamanhos diferentes.
 */
export function timingSafeEqual(a?: string | null, b?: string | null): boolean {
	if (!a || !b) return false;

	const aBuf = Buffer.from(a, "utf8");
	const bBuf = Buffer.from(b, "utf8");

	if (aBuf.length !== bBuf.length) {
		// Normaliza o custo da comparação para evitar early-return visível em timing
		const ah = createHash("sha256").update(aBuf).digest();
		const bh = createHash("sha256").update(bBuf).digest();
		nodeTimingSafeEqual(ah, bh);
		return false;
	}

	return nodeTimingSafeEqual(aBuf, bBuf);
}
