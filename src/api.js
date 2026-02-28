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
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const loadWords = () => request("/api/words");
export const saveWords = (words) =>
  request("/api/words", { method: "POST", body: JSON.stringify(words) });

export const loadPlayers = () => request("/api/players");
export const savePlayers = (players) =>
  request("/api/players", { method: "POST", body: JSON.stringify(players) });

export const saveGameResult = (entry) =>
  request("/api/history", { method: "POST", body: JSON.stringify(entry) });

export const loadVMWords = () => request("/api/vmwords");
export const saveVMWords = (words) =>
  request("/api/vmwords", { method: "POST", body: JSON.stringify(words) });

export const loadVMPlayers = () => request("/api/vmplayers");
export const saveVMPlayers = (players) =>
  request("/api/vmplayers", { method: "POST", body: JSON.stringify(players) });

export const saveVMGameResult = (entry) =>
  request("/api/vmhistory", { method: "POST", body: JSON.stringify(entry) });
