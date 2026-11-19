const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
/**
 * Returns a normalized absolute http(s) URL, or null. Rejects javascript:,
 * data:, file:, protocol-relative "//host" and anything unparsable.
 */
export function safeHttpUrl(value) {
    const input = value.trim();
    if (!input)
        return null;
    if (/^javascript:/i.test(input) || /^data:/i.test(input) || /^vbscript:/i.test(input))
        return null;
    if (input.startsWith('//'))
        return null;
    try {
        const url = new URL(input);
        if (!ALLOWED_PROTOCOLS.has(url.protocol))
            return null;
        if (url.username || url.password)
            return null;
        return url.toString();
    }
    catch {
        return null;
    }
}
/**
 * Internal navigation targets (e.g. "/shop", "/product/rose-mist") plus safe
 * absolute URLs. Used for admin-managed CTA links.
 */
export function safeLinkTarget(value) {
    const input = value.trim();
    if (!input)
        return '';
    if (input.startsWith('/') && !input.startsWith('//'))
        return input;
    if (input.startsWith('#'))
        return input;
    return safeHttpUrl(input);
}
//# sourceMappingURL=safeUrl.js.map