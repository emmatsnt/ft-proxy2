export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { clientId, clientSecret, keywords, dept } = await req.json();

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Credentials manquants" }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      });
    }

    // 1. Obtenir le token OAuth
    const tokenParams = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "api_offresdemploiv2 o2dsoffre",
    });

    const tokenRes = await fetch(
      "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams,
      }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return new Response(
        JSON.stringify({ error: `Auth échouée (${tokenRes.status}): ${err.slice(0, 200)}` }),
        { status: 401, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
      );
    }

    const { access_token } = await tokenRes.json();

    // 2. Rechercher les offres
    const searchParams = new URLSearchParams({ motsCles: keywords, range: "0-19" });
    if (dept) searchParams.append("departement", dept);

    const searchRes = await fetch(
      `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/json",
        },
      }
    );

    if (!searchRes.ok) {
      const err = await searchRes.text();
      return new Response(
        JSON.stringify({ error: `Recherche échouée (${searchRes.status}): ${err.slice(0, 200)}` }),
        { status: searchRes.status, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
      );
    }

    const data = await searchRes.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
    });
  }
}
