let apiKey = "";

export function setApiKey(key) {
  apiKey = key;
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = new Error(`API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const loadGameData = (game) => request(`/api/data?game=${game}`);

export const saveGameData = (game, words, players) =>
  request("/api/data", { method: "POST", body: JSON.stringify({ game, words, players }) });

export const saveGameResult = (entry) =>
  request("/api/history", { method: "POST", body: JSON.stringify(entry) });

export const saveVMGameResult = (entry) =>
  request("/api/vmhistory", { method: "POST", body: JSON.stringify(entry) });
