const COLORS = [
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33F5",
  "#33FFF5",
  "#F5FF33",
  "#FF8C33",
  "#8C33FF",
  "#33FF8C",
  "#FF3357",
  "#57FF33",
  "#3388FF"
];

const hashUserId = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const assignColor = (userId: string): string => {
  const index = hashUserId(userId) % COLORS.length;
  return COLORS[index];
};
