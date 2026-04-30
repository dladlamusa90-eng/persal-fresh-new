const usersById = {};

function saveUser(user) {
  usersById[user.user_id] = user;
  return user;
}

function getUserById(userId) {
  return usersById[userId] || null;
}

function updateUserById(userId, updates) {
  const existing = usersById[userId];
  if (!existing) {
    return null;
  }

  const merged = {
    ...existing,
    ...updates,
  };

  usersById[userId] = merged;
  return merged;
}

module.exports = {
  usersById,
  saveUser,
  getUserById,
  updateUserById,
};
