import { Hono } from 'hono';
import { cors } from 'hono/cors';
import OpenAI from 'openai';

interface Env {
	GROK_API_KEY: string;
}

interface Variables {
	grok: OpenAI;
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Enable CORS for all routes
app.use(
	'*',
	cors({
		origin: 'http://localhost:3000', // Specific origin instead of wildcard
		allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowHeaders: [
			'Content-Type',
			'Authorization',
			'Access-Control-Allow-Headers',
			'Access-Control-Allow-Origin',
			'Access-Control-Allow-Methods',
		],
		exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
		maxAge: 600,
		credentials: true,
	})
);

app.use(async (c, next) => {
	const grok = new OpenAI({
		apiKey: c.env.GROK_API_KEY,
		baseURL: 'https://api.x.ai/v1',
	});
	c.set('grok', grok);
	await next();
});

// Health check endpoint
app.get('/api/health', (c) => {
	return Response.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
	});
});

// Analyze image endpoint
app.post('/api/analyze', async (c) => {
	const body = await c.req.json();
	const imageData = body.image;

	// Add data:image/jpeg;base64, prefix if not present
	const imageUrl = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;

	const response = await c.var.grok.chat.completions.create({
		model: 'grok-2-vision-1212',
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'text',
						text: 'Please provide one piece of actionable feedback directed towards novice painters. Ensure the feedback is honest and not generic or insincere.',
					},
					{
						type: 'image_url',
						image_url: {
							url: imageUrl,
							detail: 'high',
						},
					},
				],
			},
		],
	});

	return Response.json({
		status: 'success',
		critique: response.choices[0].message.content,
		timestamp: new Date().toISOString(),
	});
});

export default app;
