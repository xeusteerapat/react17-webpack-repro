export function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	window.crypto.getRandomValues(array);
	return base64URLEncode(array);
}

export async function generateCodeChallenge(
	codeVerifier: string
): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(codeVerifier);
	const digest = await window.crypto.subtle.digest('SHA-256', data);
	return base64URLEncode(new Uint8Array(digest));
}

function base64URLEncode(buffer: Uint8Array): string {
	return btoa(String.fromCharCode.apply(null, [...buffer]))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}
