
interface Env {
	GROQ_API_KEY: string;
	GROQ_API_URL: string;
}


const headers = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, HEAD, PUT, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Access-Control-Allow-Origin, auth_token"
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: headers
			});
		}

		if (request.method !== "POST") {
			return new Response("Only POST allowed", { status: 405, headers: headers });
		}

		try {
			const { job, cv } = await request.json<{ job: string, cv: string }>();
			const prompt = `Given the following job description and the following cv, evaluate this cv out of 10, in terms of the following qualities: trustworthiness, level of education, level of leadership, years of experience, suitability for the role, likelihood to join. return the result in pure, syntactically correct json format with no other text. use the following fields, maximum length 64 chars: education_score, education_reason, leadership_score, leadership_reason, experience_score, experience_reason, suitability_score, suitability_reason, hiring_likelihood_score, hiring_likelihood_reason. | Job: ${job} | CV: ${cv}.`;


			const groqRes = await fetch(env.GROQ_API_URL, {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${env.GROQ_API_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: "gemma2-9b-it",
					messages: [
						{ role: "system", content: "You are a helpful assistant who only replies in syntactically correct json." },
						{ role: "user", content: prompt },
					],
				}),
			});

			if (!groqRes.ok) {
				return new Response(
					`Groq API error: ${groqRes.status} ${await groqRes.text()}`,
					{
						status: groqRes.status, headers: headers
					}
				);
			}

			const data = await groqRes.json();
			const message = data?.choices?.[0]?.message?.content ?? "";

			return Response.json({ reply: message }, { headers: headers });
		} catch (err: any) {
			console.error("Unable to process request", err);
			return new Response("Error: " + err.message, { status: 500, headers: headers });
		}
	},
};
